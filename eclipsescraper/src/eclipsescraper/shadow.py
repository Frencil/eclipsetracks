"""Model the Moon's umbral (or antumbral) shadow on the WGS-84 ellipsoid from Besselian elements.

Geometry
--------
The fundamental frame has its z axis along the shadow axis (toward the Moon/Sun), x toward
east in the Earth's equatorial plane, and y completing a right-handed set (toward north).
Its orientation in the Earth-fixed (ECEF) frame is given by the elements d (declination of
the axis) and mu (Greenwich hour angle of the axis, corrected from the ephemeris meridian).

The umbral cone has radius L2(zeta) = l2 - zeta * tan(f2) at height zeta above the
fundamental plane, centered on (x, y). A generator of the cone at angle Q is the line

    P(zeta) = (x + l2 cosQ) xhat + (y + l2 sinQ) yhat + zeta * (zhat - tan(f2) (cosQ xhat + sinQ yhat))

A negative L2 (total eclipse) is the same circle traversed from the opposite side, and a
hybrid eclipse's L2 passes smoothly through zero, so the signed radius is used throughout.

Seen along the shadow axis, the shadowed part of the Earth is the intersection of the cone's
disc with the Earth's silhouette (an ellipse). Both are convex, so the intersection is too,
and its boundary consists of:

  * cone generators that hit the Earth, at the first intersection coming from the Moon, and
  * points of the Earth's limb (tangent to the axis direction) that fall inside the cone,
    i.e. where the shadow hangs off the Earth near sunrise/sunset.

This holds whether or not the shadow axis itself meets the Earth, so it covers the whole time
the umbra touches the Earth, including the minutes when only part of it does.

The boundary is traced densely, ordered around its centroid on the fundamental plane, and
then resampled to a fixed number of vertices spaced by ground distance weighted toward curvy
parts (so long slivers along the sunrise/sunset line and their sharp corners are both well
represented).

All lengths are in units of the Earth's equatorial radius, as in the Besselian elements,
unless noted as km.
"""

import datetime
import math

from czml3 import Document, Packet
from czml3.properties import Material, Polygon, Position, PositionList
from czml3.types import TimeInterval

from .common import CZML_VERSION, UMBRAL_SHADOW_RGBA, solid

# WGS-84
WGS84_A = 6378137.0
WGS84_F = 1 / 298.257223563
_B = 1 - WGS84_F  # polar radius in equatorial radii
_B2 = _B * _B
_A_KM = WGS84_A / 1000

TWO_PI = 2 * math.pi


def fundamental_frame(d, mu):
    """Unit vectors (xhat, yhat, zhat) of the fundamental frame in ECEF coordinates."""
    cd, sd, cm, sm = math.cos(d), math.sin(d), math.cos(mu), math.sin(mu)
    zhat = (cd * cm, -cd * sm, sd)
    xhat = (sm, cm, 0.0)
    yhat = (-sd * cm, sd * sm, cd)
    return xhat, yhat, zhat


def _combine(*terms):
    return tuple(sum(c * v[i] for c, v in terms) for i in range(3))


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _m(v):
    """Apply the ellipsoid metric diag(1, 1, 1/b^2)."""
    return (v[0], v[1], v[2] / _B2)


def _intersect(origin, direction):
    """Intersect the line origin + s * direction with the ellipsoid.

    Returns (discriminant, s) where s is the larger root (nearest the Moon), or the point of
    closest approach in the metric if the line misses (negative discriminant).
    """
    md = _m(direction)
    a = _dot(direction, md)
    b = 2 * _dot(origin, md)
    c = _dot(origin, _m(origin)) - 1
    disc = b * b - 4 * a * c
    if disc < 0:
        return disc, -b / (2 * a)
    return disc, (-b + math.sqrt(disc)) / (2 * a)


def ecef_to_geodetic(p):
    """(lon, lat) in degrees for a point on (or very near) the ellipsoid surface."""
    x, y, z = p
    lon = math.degrees(math.atan2(y, x))
    lat = math.degrees(math.atan2(z, _B2 * math.hypot(x, y)))
    return lon, lat


class ShadowSnapshot:
    """Shadow geometry at one instant."""

    def __init__(self, elements, utc, umbra=True):
        v = elements.at(utc)
        self.x, self.y = v["x"], v["y"]
        self.l, self.tan_f = (v["l2"], elements.tan_f2) if umbra else (v["l1"], elements.tan_f1)
        self.xhat, self.yhat, self.zhat = fundamental_frame(v["d"], v["mu"])
        self._mz = _m(self.zhat)
        self._zmz = _dot(self.zhat, self._mz)

    def generator(self, q):
        """Origin and direction of the cone generator at angle q."""
        cq, sq = math.cos(q), math.sin(q)
        origin = _combine((self.x + self.l * cq, self.xhat), (self.y + self.l * sq, self.yhat))
        direction = _combine((1.0, self.zhat), (-self.tan_f * cq, self.xhat), (-self.tan_f * sq, self.yhat))
        return origin, direction

    def cone_point(self, q):
        """ECEF point where the generator at angle q meets the sunlit Earth, or None.

        Generators are tilted from the axis by up to the Sun's semi-diameter (f2 ~ 0.27 deg),
        so near the terminator one can hit the Earth tens of km beyond the sunrise/sunset
        line. Those hits are on the night side (Sun's center below the horizon) and don't
        count; the limb bounds the shadow there instead.
        """
        origin, direction = self.generator(q)
        disc, s = _intersect(origin, direction)
        if disc < 0:
            return None
        p = _combine((1.0, origin), (s, direction))
        if _dot(_m(p), self.zhat) < 0:  # surface normal faces away from the Sun
            return None
        return p

    def cone_point_unchecked(self, q):
        """Where the generator at angle q meets (or passes closest to) the Earth, without the
        sunlit-side check. For angles between the corners of a partial shadow, where the
        point is valid by construction, this avoids precision-level misses near the corners."""
        origin, direction = self.generator(q)
        return _combine((1.0, origin), (_intersect(origin, direction)[1], direction))

    def limb_point_unchecked(self, phi):
        """The limb point in direction phi, whether or not it's inside the cone."""
        rho, s = self._limb(phi)
        u = _combine((math.cos(phi), self.xhat), (math.sin(phi), self.yhat))
        return _combine((rho, u), (s, self.zhat))

    def limb_margin(self, phi):
        """How far (equatorial radii, on the fundamental plane) the limb point in direction
        phi lies outside the cone; negative when inside."""
        rho, s = self._limb(phi)
        xi, eta = rho * math.cos(phi), rho * math.sin(phi)
        return math.hypot(xi - self.x, eta - self.y) - abs(self.l - s * self.tan_f)

    def _limb(self, phi):
        """(rho, s): the limb point in direction phi is rho * u + s * zhat."""
        u = _combine((math.cos(phi), self.xhat), (math.sin(phi), self.yhat))
        umz = _dot(u, self._mz)
        denom = umz * umz - self._zmz * _dot(u, _m(u))
        rho = math.sqrt(-self._zmz / denom)
        return rho, -rho * umz / self._zmz

    def limb_window(self):
        """Range of limb directions phi that can be inside the cone."""
        r = math.hypot(self.x, self.y)
        if r < 1e-9:
            return 0.0, TWO_PI
        half = min(math.pi, math.asin(min(1.0, (abs(self.l) + 0.05) / r)) + 0.05)
        phi = math.atan2(self.y, self.x)
        return phi - half, phi + half

    def touches_earth(self):
        """Whether any of the shadow falls on the sunlit Earth."""
        if self.cone_point(0.0) is not None:
            return True
        # Otherwise any shadow on the Earth crosses the limb: minimize the limb margin
        lo, hi = self.limb_window()
        n = 90
        best = min(range(n + 1), key=lambda i: self.limb_margin(lo + (hi - lo) * i / n))
        a, b = lo + (hi - lo) * (best - 1) / n, lo + (hi - lo) * (best + 1) / n
        for _ in range(50):  # golden-section search for the minimum
            m1, m2 = a + (b - a) * 0.382, a + (b - a) * 0.618
            if self.limb_margin(m1) > self.limb_margin(m2):
                a = m1
            else:
                b = m2
        return self.limb_margin((a + b) / 2) <= 0

    def limb_point(self, phi):
        """ECEF point of the Earth's limb (as seen along the axis) in fundamental-plane
        direction phi, if it lies inside the cone; otherwise None."""
        if self.limb_margin(phi) > 0:
            return None
        return self.limb_point_unchecked(phi)

    def axis_point(self):
        origin = _combine((self.x, self.xhat), (self.y, self.yhat))
        disc, s = _intersect(origin, self.zhat)
        if disc < 0:
            return None
        return _combine((1.0, origin), (s, self.zhat))

    def plane(self, p):
        return _dot(p, self.xhat), _dot(p, self.yhat)


def _km(p, q):
    return math.dist(p, q) * _A_KM


def _trace(f, p0=0.0, p1=TWO_PI, closed=True, n0=180, max_gap_km=5.0, min_dparam=1e-9):
    """Trace the valid part of the curve param -> f(param) (ECEF point or None) for param in
    [p0, p1) (closed: wrapping around), refining where consecutive points are far apart and
    bisecting each valid/invalid transition.

    Returns (sorted [(param, point), ...] of valid points; whether any initial sample was
    invalid).
    """
    params = [p0 + (p1 - p0) * i / (n0 if closed else n0 - 1) for i in range(n0)]
    samples = [(p, f(p)) for p in params]
    any_invalid = any(a is None for _, a in samples)
    out = []
    for i, (pa, a) in enumerate(samples):
        if a is not None:
            out.append((pa, a))
        if not closed and i == n0 - 1:
            break
        pb, b = samples[(i + 1) % n0]
        if pb <= pa:
            pb += p1 - p0
        stack = [(pa, a, pb, b)]
        while stack:
            pa_, a_, pb_, b_ = stack.pop()
            if pb_ - pa_ < min_dparam:
                continue
            if a_ is not None and b_ is not None:
                if _km(a_, b_) <= max_gap_km:
                    continue
                pm = (pa_ + pb_) / 2
                m = f(pm)
                if m is not None:
                    out.append((pm, m))
                stack += [(pa_, a_, pm, m), (pm, m, pb_, b_)]
            elif (a_ is None) != (b_ is None):
                # Bisect for the transition; keep the last valid point (a corner)
                lo, hi, valid = (pa_, pb_, a_) if a_ is not None else (pb_, pa_, b_)
                for _ in range(60):
                    if abs(hi - lo) < min_dparam:
                        break
                    mid = (lo + hi) / 2
                    m = f(mid)
                    if m is not None:
                        lo, valid = mid, m
                    else:
                        hi = mid
                out.append((lo, valid))
                # Refine between the original valid end and the corner
                if a_ is not None:
                    stack.append((pa_, a_, lo, valid))
                else:
                    stack.append((lo, valid, pb_, b_))
    if closed:
        out = [((p - p0) % (p1 - p0) + p0, a) for p, a in out]
    out.sort(key=lambda pa: pa[0])
    return out, any_invalid


def _contiguous(arc, period):
    """Order traced (param, point) samples of a closed curve along their arc, which may wrap
    through 0: start just after the largest gap in parameter and unwrap so params increase."""
    if len(arc) < 2:
        return list(arc)
    gaps = [((arc[(i + 1) % len(arc)][0] - arc[i][0]) % period, i) for i in range(len(arc))]
    _, i = max(gaps)
    ordered = arc[i + 1:] + arc[:i + 1]
    out = [ordered[0]]
    for q, a in ordered[1:]:
        while q < out[-1][0]:
            q += period
        out.append((q, a))
    return out


def _corner_directions(snap, cone_arc):
    """Limb directions (fundamental-plane angles) of corner B and corner A, unwrapped so the
    short way from B to A is increasing. The limb arc inside the cone runs between them."""
    def direction(p):
        x, y = snap.plane(p)
        return math.atan2(y, x)
    phi_b, phi_a = direction(cone_arc[-1][1]), direction(cone_arc[0][1])
    phi_a = phi_b + (phi_a - phi_b + math.pi) % TWO_PI - math.pi
    return (phi_b, phi_a) if phi_a >= phi_b else (phi_a, phi_b)


def _boundary_arcs(elements, utc, umbra=True):
    """(snap, cone_arc, limb_arc) of the shadow at utc, or None if it's not on the Earth.

    cone_arc is the ordered list of (generator angle, ECEF point) where cone generators meet
    the sunlit Earth, with increasing (unwrapped) angles. limb_arc is None while the whole
    cone lands on the sunlit side; otherwise the cone arc runs from corner A to corner B
    (where it meets the limb) and limb_arc is the ordered list of ECEF limb points inside
    the cone from corner B back to corner A (possibly empty for a tiny shadow).
    """
    snap = ShadowSnapshot(elements, utc, umbra)
    cone, some_miss = _trace(snap.cone_point)
    if not cone:
        return None
    if not some_miss:
        return snap, cone, None
    # Some generators miss the sunlit Earth, so the limb bounds part of the shadow. Join the
    # cone arc (in generator order) and the limb arc between the corners (in direction
    # order). (Sorting all points by angle on the fundamental plane doesn't work: near the
    # limb the shadow's edge there isn't convex at the km scale.)
    cone_arc = _contiguous(cone, TWO_PI)
    limb, _ = _trace(snap.limb_point, *_corner_directions(snap, cone_arc), closed=False, n0=64)
    limb_arc = [a for _, a in limb]
    if len(limb_arc) > 1 and _km(cone_arc[-1][1], limb_arc[-1]) < _km(cone_arc[-1][1], limb_arc[0]):
        limb_arc.reverse()
    return snap, cone_arc, limb_arc


def _dedupe(points, closed=True):
    out = []
    for p in points:  # drop exact/near duplicates (e.g. corners found from both curves)
        if not out or _km(p, out[-1]) > 1e-3:
            out.append(p)
    if closed and len(out) > 1 and _km(out[0], out[-1]) <= 1e-3:
        out.pop()
    return out


def shadow_boundary(elements, utc, umbra=True):
    """Dense ordered boundary of the shadow on the Earth as (ECEF points in equatorial radii,
    centroid on the fundamental plane, ShadowSnapshot), or None if the shadow doesn't touch
    the Earth."""
    arcs = _boundary_arcs(elements, utc, umbra)
    if arcs is None:
        return None
    snap, cone_arc, limb_arc = arcs
    points = _dedupe([a for _, a in cone_arc] + (limb_arc or []))
    planar = [snap.plane(p) for p in points]
    cx = sum(p[0] for p in planar) / len(planar)
    cy = sum(p[1] for p in planar) / len(planar)
    return points, (cx, cy), snap


# How shadow_outline spreads vertices around a partial shadow: fractions allotted by turning
# angle (sliver tips, corners), by sqrt(length * turning) (roughly equalizes chord error on
# curves) and by ground length (covers long, nearly straight stretches)
WEIGHT_BLEND = (0.25, 0.5, 0.25)


def _turning(points, i):
    n = len(points)
    a = [points[i][k] - points[i - 1][k] for k in range(3)]
    b = [points[(i + 1) % n][k] - points[i][k] for k in range(3)]
    na, nb = math.sqrt(_dot(a, a)), math.sqrt(_dot(b, b))
    if na == 0 or nb == 0:
        return 0.0
    return math.acos(max(-1.0, min(1.0, _dot(a, b) / (na * nb))))


def _precise_corners(snap, cone_arc):
    """Precise corners of a partial shadow as ((qa, phi_a, point_a), (qb, phi_b, point_b)).

    The traced corners come from bisecting generator angle, but near a corner the ground
    point moves like sqrt(angle), so their positions are only good to ~0.1 km, which makes
    the outline jitter. Each corner is instead a simple root of the limb's margin in limb
    direction, where the limb is smooth; its generator angle then follows from its position.
    Returns None if the limb arc is too small to resolve (a nearly pointlike shadow).
    """
    lo, hi = _corner_directions(snap, cone_arc)
    mid = (lo + hi) / 2
    if snap.limb_margin(mid) > 0:
        return None

    def root(outside, inside):
        while snap.limb_margin(outside) <= 0:  # step out until actually outside
            outside += outside - inside
        for _ in range(80):
            m = (outside + inside) / 2
            if snap.limb_margin(m) > 0:
                outside = m
            else:
                inside = m
        return inside

    width = max(hi - lo, 1e-9)
    phis = (root(lo - width * 0.01 - 1e-9, mid), root(hi + width * 0.01 + 1e-9, mid))
    corners = []
    for phi in phis:
        p = snap.limb_point_unchecked(phi)
        xi, eta = snap.plane(p)
        q = math.atan2(eta - snap.y, xi - snap.x)
        if snap.l - _dot(p, snap.zhat) * snap.tan_f < 0:  # negative radius: opposite side
            q += math.pi
        corners.append((q, phi, p))
    # Match to the traced corners A (start of the cone arc) and B (end), unwrapping angles
    qa_trace, qb_trace = cone_arc[0][0], cone_arc[-1][0]
    if _km(corners[0][2], cone_arc[0][1]) > _km(corners[1][2], cone_arc[0][1]):
        corners.reverse()

    def unwrap(q, near):
        return near + (q - near + math.pi) % TWO_PI - math.pi

    (qa, pa_, a), (qb, pb_, b) = corners
    return (unwrap(qa, qa_trace), pa_, a), (unwrap(qb, qb_trace), pb_, b)


def _partial_loop(snap, cone_arc, cone_grid=1024, limb_grid=256):
    """Closed loop of ECEF points for a shadow partly off the limb, starting at corner A,
    running along the cone to corner B, then back along the limb.

    The points are evaluated at parameters that vary smoothly with time (between precise
    corners: Chebyshev-spaced in generator angle so they're dense near the corners where
    the ground stretches; uniform in limb direction), and none are skipped, so measures
    derived from them, like turning angles, also vary smoothly.
    """
    corners = _precise_corners(snap, cone_arc)
    if corners is None:
        (qa, a), (qb, b) = cone_arc[0], cone_arc[-1]
        lo, hi = _corner_directions(snap, cone_arc)
        phi_a, phi_b = (lo, hi) if _km(snap.limb_point_unchecked(lo), a) < _km(snap.limb_point_unchecked(hi), a) else (hi, lo)
    else:
        (qa, phi_a, a), (qb, phi_b, b) = corners
    cone = [a]
    for k in range(1, cone_grid):
        cone.append(snap.cone_point_unchecked(qa + (qb - qa) * (1 - math.cos(math.pi * k / cone_grid)) / 2))
    cone.append(b)
    limb = [snap.limb_point_unchecked(phi_b + (phi_a - phi_b) * k / limb_grid) for k in range(1, limb_grid)]
    return cone + limb


def _place(points, measure, targets):
    """Points at the given targets of a cumulative measure along the polyline points."""
    out, j = [], 0
    for target in targets:
        while j < len(points) - 2 and measure[j + 1] < target:
            j += 1
        span = measure[j + 1] - measure[j]
        f = (target - measure[j]) / span if span else 0.0
        a, b = points[j], points[j + 1]
        out.append([a[c] + f * (b[c] - a[c]) for c in range(3)])
    return out


def shadow_outline(elements, utc, n_vertices, umbra=True):
    """The shadow outline as n_vertices (lon, lat) points, or None.

    Vertices are placed so that each moves continuously over time:

    * While the whole cone lands on the sunlit Earth (most of an eclipse), vertex i is where
      the generator at angle 2 pi i / n meets the Earth.
    * While part of the shadow hangs off the limb, vertex 0 sits exactly on a corner where
      the cone meets the limb, and the rest are spread evenly around the loop by a blend of
      turning angle, sqrt(length * turning) and length (see WEIGHT_BLEND), which crowds
      them at the corners and at the tight far tip of a shadow stretched by a low Sun.

    The switch between the two placements, when the shadow comes fully onto (or starts to
    leave) the sunlit Earth, reorders the vertices; that happens once at each end.
    """
    arcs = _boundary_arcs(elements, utc, umbra)
    if arcs is None:
        return None
    snap, cone_arc, limb_arc = arcs
    if limb_arc is None:
        points = [snap.cone_point(TWO_PI * i / n_vertices) for i in range(n_vertices)]
        if all(p is not None for p in points):
            return [ecef_to_geodetic(p) for p in points]
        # Vanishingly rare (a miss between trace samples): treat as partial
        cone_arc = _contiguous([(TWO_PI * i / n_vertices, p) for i, p in enumerate(points) if p is not None], TWO_PI)
    loop = _partial_loop(snap, cone_arc)
    m = len(loop)
    if m < 3:
        return [ecef_to_geodetic(loop[0])] * n_vertices

    seg = [_km(loop[i], loop[(i + 1) % m]) for i in range(m)]
    turns = [_turning(loop, i) for i in range(m)]
    seg_turn = [(turns[i] + turns[(i + 1) % m]) / 2 for i in range(m)]
    measures = (seg_turn, [math.sqrt(seg[i] * seg_turn[i]) for i in range(m)], seg)
    totals = [sum(x) or 1.0 for x in measures]
    weights = [sum(w * x[i] / t for w, x, t in zip(WEIGHT_BLEND, measures, totals)) for i in range(m)]
    total = sum(weights) or 1.0
    cumulative = [0.0]
    for w in weights:
        cumulative.append(cumulative[-1] + w / total)
    closed = loop + [loop[0]]

    # Evenly spaced in the blended measure, starting from corner A. (Pinning a vertex on
    # corner B too would need an integer split of vertices between the two arcs, and that
    # split flickers back and forth when the arcs' shares are near a rounding boundary.)
    targets = [k / n_vertices for k in range(n_vertices)]
    return [ecef_to_geodetic(p) for p in _place(closed, cumulative, targets)]


def axis_point(elements, utc):
    """(lon, lat) where the shadow axis meets the Earth, or None if it misses."""
    p = ShadowSnapshot(elements, utc).axis_point()
    return None if p is None else ecef_to_geodetic(p)


def _interval(predicate, start, end, step_seconds=10, precision_seconds=0.001):
    """(first, last) times in [start, end] where predicate holds, located by a coarse scan
    and refined by bisection, or None."""
    step = datetime.timedelta(seconds=step_seconds)

    def refine(a, b):  # predicate(a) != predicate(b)
        ha = predicate(a)
        while (b - a).total_seconds() > precision_seconds:
            m = a + (b - a) / 2
            if predicate(m) == ha:
                a = m
            else:
                b = m
        return a if ha else b

    t, first, last = start, None, None
    prev = predicate(t)
    if prev:
        first = start
    while t < end:
        nxt = min(t + step, end)
        h = predicate(nxt)
        if h != prev:
            edge = refine(t, nxt)
            if h and first is None:
                first = edge
            if not h:
                last = edge
        prev, t = h, nxt
    if first is None:
        return None
    return first, last or end


def central_interval(elements):
    """UTC (start, end) during which the shadow axis meets the Earth."""
    return _interval(lambda t: axis_point(elements, t) is not None, *elements.valid_utc())


def shadow_interval(elements, umbra=True):
    """UTC (start, end) during which any of the shadow touches the Earth."""
    return _interval(lambda t: ShadowSnapshot(elements, t, umbra).touches_earth(), *elements.valid_utc())


def _isotime(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _ecef_km(lon, lat):
    """Spherical ECEF approximation in km, adequate for measuring interpolation error."""
    lo, la = math.radians(lon), math.radians(lat)
    return (_A_KM * math.cos(la) * math.cos(lo), _A_KM * math.cos(la) * math.sin(lo), _A_KM * math.sin(la))


def adaptive_samples(elements, start, end, n_vertices, step_seconds=60, tolerance_km=0.5,
                     min_step_seconds=0.01):
    """Sample the outline over [start, end] so that linearly interpolating every vertex
    between consecutive samples stays within tolerance_km of the true outline vertices
    (checked at each interval's midpoint).

    Mid-track a coarse step suffices, but near first/last contact the shadow changes shape
    quickly, so those intervals get subdivided down to fractions of a second.

    Returns [(utc, [(lon, lat), ...]), ...] in time order.
    """
    def sample(t):
        return t, shadow_outline(elements, t, n_vertices)

    def error_km(a, b, mid):
        f = (mid[0] - a[0]) / (b[0] - a[0])
        worst = 0.0
        for pa, pb, pm in zip(a[1], b[1], mid[1]):
            ea, eb, em = _ecef_km(*pa), _ecef_km(*pb), _ecef_km(*pm)
            worst = max(worst, math.dist([ea[i] + f * (eb[i] - ea[i]) for i in range(3)], em))
        return worst

    def refine(a, b):
        mid = sample(a[0] + (b[0] - a[0]) / 2)
        if (b[0] - a[0]).total_seconds() <= min_step_seconds or error_km(a, b, mid) <= tolerance_km:
            return [a]
        return refine(a, mid) + refine(mid, b)

    # Coarse grid on whole multiples of the step, plus the exact start and end
    grid = [start]
    t = start.replace(second=0, microsecond=0) + datetime.timedelta(minutes=1)
    while t < end:
        if t > start:
            grid.append(t)
        t += datetime.timedelta(seconds=step_seconds)
    grid.append(end)

    coarse = [sample(t) for t in grid]
    samples = []
    for a, b in zip(coarse, coarse[1:]):
        samples += refine(a, b)
    return samples + [coarse[-1]]


def shadow_window(elements):
    """The UTC (start, end) interval the umbral shadow is shown, or None if it misses Earth.

    Cheap compared to umbral_shadow_packets, so track CZML can cover it in its clock without
    generating the shadow.
    """
    interval = shadow_interval(elements)
    if interval is None:
        return None
    # Start/end just inside first/last contact, where the shadow is a sliver rather than a point
    inset = datetime.timedelta(milliseconds=50)
    start, end = interval[0] + inset, interval[1] - inset
    while shadow_boundary(elements, start) is None:
        start += inset
    while shadow_boundary(elements, end) is None:
        end -= inset
    return start, end


def umbral_shadow_packets(iso, elements, n_vertices=48, tolerance_km=0.5, rgba=UMBRAL_SHADOW_RGBA):
    """CZML packets rendering the umbral shadow as a polygon whose vertices move over time,
    and the UTC (start, end) interval the shadow is shown (see shadow_window).

    Each vertex is a position-only packet with time-sampled positions; the polygon refers to
    those positions, so Cesium interpolates every vertex between samples. Samples are
    adaptive (see adaptive_samples) and interpolated linearly.
    """
    window = shadow_window(elements)
    if window is None:
        return [], None
    start, end = window
    samples = adaptive_samples(elements, start, end, n_vertices, tolerance_km=tolerance_km)

    epoch = start
    vertex_samples = [[] for _ in range(n_vertices)]
    for t, outline in samples:
        sec = round((t - epoch).total_seconds(), 3)
        for i, (lon, lat) in enumerate(outline):
            vertex_samples[i] += [sec, round(lon, 4), round(lat, 4), 0.0]

    availability = TimeInterval(start=_isotime(start), end=_isotime(end))
    vertex_ids = ["umbral_shadow_vertex_%02d_%s" % (i, iso) for i in range(n_vertices)]
    packets = [
        Packet(
            id=vertex_id,
            availability=availability,
            position=Position(
                epoch=_isotime(epoch),
                cartographicDegrees=vertex_samples[i],
                interpolationAlgorithm="LINEAR",
            ),
        )
        for i, vertex_id in enumerate(vertex_ids)
    ]
    packets.append(
        Packet(
            id="umbral_shadow_%s" % iso,
            availability=availability,
            polygon=Polygon(
                show=True,
                material=Material(solidColor=solid(rgba)),
                positions=PositionList(references=[v + "#position" for v in vertex_ids]),
            ),
        )
    )
    return packets, (start, end)


def umbral_shadow_czml(iso, elements, **kwargs):
    """A standalone CZML document for the umbral shadow, loaded alongside the track's CZML.

    It has no clock: the track's document sets the clock, covering shadow_window. Returns
    (document, window), or (None, None) if the shadow misses Earth.
    """
    packets, window = umbral_shadow_packets(iso, elements, **kwargs)
    if not packets:
        return None, None
    document = Packet(id="document", version=CZML_VERSION, name="EclipseTracks.org %s umbral shadow" % iso)
    return Document(packets=[document] + packets), window
