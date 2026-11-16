import datetime
import json
import math
import unittest

from eclipsescraper import BesselianElements, EclipseTrack, beselm_url, parse_beselm_html
from eclipsescraper.shadow import (
    WGS84_A, axis_point, central_interval, shadow_boundary, shadow_interval, shadow_outline,
    umbral_shadow_packets,
)

from .test_eclipsescraper import read_fixture


def km(a, b):
    """Great-circle distance in km (spherical; fine for sub-km comparisons)."""
    lon1, lat1, lon2, lat2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def km_to_outline(p, outline):
    """Approximate distance in km from point p to a closed outline of (lon, lat) vertices."""
    k = math.cos(math.radians(p[1]))

    def xy(q):
        return (((q[0] - p[0] + 540) % 360 - 180) * k * 111.195, (q[1] - p[1]) * 111.195)

    best = float("inf")
    for i in range(len(outline)):
        (ax, ay), (bx, by) = xy(outline[i]), xy(outline[(i + 1) % len(outline)])
        vx, vy = bx - ax, by - ay
        t = max(0.0, min(1.0, -(ax * vx + ay * vy) / ((vx * vx + vy * vy) or 1)))
        best = min(best, math.hypot(ax + t * vx, ay + t * vy))
    return best


class BesselianTestCase(unittest.TestCase):

    def test_beselm_url(self):
        self.assertEqual(
            beselm_url('http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Feb06Apath.html'),
            'https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Feb06Abeselm.html')
        self.assertEqual(
            beselm_url('https://eclipse.gsfc.nasa.gov/SEpath/SEpath1951/SE1986Oct03Hpath.html'),
            'https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm1951/SE1986Oct03Hbeselm.html')
        with self.assertRaises(ValueError):
            beselm_url('https://example.com/foo.html')

    def test_parse_20270206(self):
        data = parse_beselm_html(read_fixture('SE2027Feb06Abeselm.html'))
        self.assertEqual(data['t0'], '2027-02-06T16:00:00.0Z')
        self.assertEqual(data['valid_hours'], [-3.0, 3.0])
        self.assertEqual(data['delta_t'], 71.6)
        self.assertEqual(data['greatest_eclipse_ut'][:19], '2027-02-06T15:59:35')
        self.assertEqual((data['gamma'], data['magnitude']), (-0.2952, 0.9281))
        self.assertEqual((data['tan_f1'], data['tan_f2']), (0.0047426, 0.004719))
        self.assertEqual(data['coefficients'], {
            'x': [0.111743, 0.4664823, -0.0000325, -0.0000032],
            'y': [-0.273277, 0.2031840, 0.0001025, -0.0000025],
            'd': [-15.54794, 0.012383, 0.000004],
            'l1': [0.571927, -0.0000653, -0.0000101],
            'l2': [0.025661, -0.0000650, -0.0000100],
            'mu': [56.49306, 15.000512],
        })
        json.dumps(data)  # must be serializable

    # NASA prints the event date beside t0, but t0 = 00:00 TDT is really the next day here
    def test_parse_t0_next_day(self):
        data = parse_beselm_html(read_fixture('SE2052Sep22Abeselm.html'))
        self.assertEqual(data['greatest_eclipse_ut'][:16], '2052-09-22T23:37')
        self.assertEqual(data['t0'], '2052-09-23T00:00:00.0Z')
        self.assertEqual(data['valid_hours'], [-3.0, 3.0])

    def test_time_conversion(self):
        el = BesselianElements(parse_beselm_html(read_fixture('SE2027Feb06Abeselm.html')))
        utc = datetime.datetime(2027, 2, 6, 15, 58, 48, 400000, tzinfo=datetime.timezone.utc)
        self.assertAlmostEqual(el.t(utc), 0.0, places=9)  # 15:58:48.4 UT + 71.6 s = t0
        self.assertEqual(el.utc(el.t(utc)), utc)


def ecef_km(lon, lat):
    """WGS-84 geodetic (degrees) to ECEF km."""
    b2 = (1 - 1 / 298.257223563) ** 2
    lo, la = math.radians(lon), math.radians(lat)
    n = WGS84_A / 1000 / math.sqrt(1 - (1 - b2) * math.sin(la) ** 2)
    return (n * math.cos(la) * math.cos(lo), n * math.cos(la) * math.sin(lo), n * b2 * math.sin(la))


def km_to_polygon(p, polygon):
    """Distance in km from ECEF km point p to a closed polygon of ECEF km points."""
    best = float("inf")
    for i in range(len(polygon)):
        a, b = polygon[i], polygon[(i + 1) % len(polygon)]
        ab = [b[k] - a[k] for k in range(3)]
        ab2 = sum(x * x for x in ab)
        t = 0.0 if ab2 == 0 else max(0.0, min(1.0, sum(ab[k] * (p[k] - a[k]) for k in range(3)) / ab2))
        best = min(best, math.dist(p, [a[k] + t * ab[k] for k in range(3)]))
    return best


def boundary_km(elements, utc):
    """Dense shadow boundary as ECEF km points."""
    return [[c * WGS84_A / 1000 for c in p] for p in shadow_boundary(elements, utc)[0]]


def total_turning_degrees(points):
    total = 0.0
    n = len(points)
    for i in range(n):
        a = [points[i][k] - points[i - 1][k] for k in range(3)]
        b = [points[(i + 1) % n][k] - points[i][k] for k in range(3)]
        na, nb = math.sqrt(sum(x * x for x in a)), math.sqrt(sum(x * x for x in b))
        if na and nb:
            total += math.acos(max(-1.0, min(1.0, sum(a[k] * b[k] for k in range(3)) / (na * nb))))
    return math.degrees(total)


class ShadowModelTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.elements = BesselianElements(parse_beselm_html(read_fixture('SE2027Feb06Abeselm.html')))
        cls.track = EclipseTrack(datetime.date(2027, 2, 6))
        cls.html = read_fixture('SE2027Feb06Apath.html')
        cls.track.loadFromRawHTML(cls.html)
        cls.shadow = shadow_interval(cls.elements)
        # Coarse tolerance keeps this fast; structure is what's tested here
        cls.packets, cls.packets_interval = umbral_shadow_packets(
            '2027-02-06', cls.elements, n_vertices=12, tolerance_km=50)

    def offsets(self, seconds):
        """Times the given offsets after first contact and before last contact."""
        start, end = self.shadow
        return [t for s in seconds
                for t in (start + datetime.timedelta(seconds=s), end - datetime.timedelta(seconds=s))]

    # The model must reproduce NASA's tabulated central line and limits (rounded to 0.1')
    def test_matches_nasa_path_table(self):
        datetimes = self.track.datetimes()
        for t in range(0, len(datetimes), 5):
            dt = datetimes[t]
            self.assertLess(km(axis_point(self.elements, dt), self.track.position['central'][t]), 0.25)
            boundary = boundary_km(self.elements, dt)
            for limit in ('north', 'south'):
                self.assertLess(km_to_polygon(ecef_km(*self.track.position[limit][t]), boundary), 0.25,
                                '%s limit at %s' % (limit, dt))

    # Rows with only one limit (dropped from the track) are when the shadow hangs off the limb
    def test_matches_nasa_partial_rows(self):
        rows = [r.split() for r in self.html.splitlines() if r.startswith(' 14:08 ') or r.startswith(' 17:52 ')]
        self.assertEqual(len(rows), 2)
        for row in rows:
            row = self.track.preparseHyphens(row)
            utc = datetime.datetime.combine(self.track.date, datetime.time(int(row[0][:2]), int(row[0][3:])),
                                            tzinfo=datetime.timezone.utc)
            points = [(self.track.NorthLimitLon(row), self.track.NorthLimitLat(row)),
                      (self.track.SouthLimitLon(row), self.track.SouthLimitLat(row))]
            points = [p for p in points if None not in p]
            self.assertEqual(len(points), 1)
            self.assertLess(km_to_polygon(ecef_km(*points[0]), boundary_km(self.elements, utc)), 0.25)

    # NASA's sunrise/sunset points of the limits are on the shadow's boundary at some instant
    def test_matches_nasa_sunrise_sunset_limits(self):
        boundaries = [boundary_km(self.elements, t) for t in self.offsets(range(0, 600, 5))
                      if shadow_boundary(self.elements, t) is not None]
        for limit in ('north', 'south'):
            for point in self.track.limits[limit]:
                p = ecef_km(*point)
                self.assertLess(min(km_to_polygon(p, b) for b in boundaries), 0.5, '%s limit %s' % (limit, point))

    def test_intervals(self):
        start, end = central_interval(self.elements)
        one_second = datetime.timedelta(seconds=1)
        self.assertIsNotNone(axis_point(self.elements, start + one_second))
        self.assertIsNone(axis_point(self.elements, start - one_second))
        self.assertIsNotNone(axis_point(self.elements, end - one_second))
        self.assertIsNone(axis_point(self.elements, end + one_second))
        # First/last contact of the axis are NASA's sunrise/sunset "Limits" on the central line.
        # The grazing point moves extremely fast near contact (~4 km within 1 ms), so compare
        # 1 ms inside the interval (the resolution of central_interval) with a loose tolerance.
        one_ms = datetime.timedelta(milliseconds=1)
        self.assertLess(km(axis_point(self.elements, start + one_ms), self.track.limits['central'][0]), 5)
        self.assertLess(km(axis_point(self.elements, end - one_ms), self.track.limits['central'][1]), 5)
        # The umbra touches the Earth for a few minutes before/after its axis does
        shadow_start, shadow_end = self.shadow
        self.assertTrue(datetime.timedelta(minutes=2) < start - shadow_start < datetime.timedelta(minutes=5))
        self.assertTrue(datetime.timedelta(minutes=2) < shadow_end - end < datetime.timedelta(minutes=5))
        self.assertIsNone(shadow_boundary(self.elements, shadow_start - one_second))
        self.assertIsNotNone(shadow_boundary(self.elements, shadow_start + one_second))
        self.assertIsNone(shadow_boundary(self.elements, shadow_end + one_second))

    # The boundary is a simple convex loop, also when it's a sliver along the sunrise line
    def test_boundary_is_simple(self):
        for t in self.offsets([0.1, 1, 20, 60, 300, 3600]):
            self.assertLess(total_turning_degrees(boundary_km(self.elements, t)), 400, t)

    # 48 vertices follow the true boundary over the shadow's whole lifetime: within a few km
    # while it's a long teardrop hanging off the limb, much closer otherwise
    def test_outline_follows_boundary(self):
        for t in self.offsets([0.1, 1, 5, 20, 60, 120, 300, 420, 3600]):
            polygon = [ecef_km(*v) for v in shadow_outline(self.elements, t, 48)]
            boundary = boundary_km(self.elements, t)
            worst = max(km_to_polygon(p, polygon) for p in boundary[::max(1, len(boundary) // 200)])
            self.assertLess(worst, 4.0, t)

    # Vertices move continuously (no jitter along the boundary between nearby instants)
    def test_outline_is_continuous(self):
        for t in self.offsets([1, 20, 300, 3600]):
            a = shadow_outline(self.elements, t, 48)
            b = shadow_outline(self.elements, t + datetime.timedelta(milliseconds=10), 48)
            self.assertLess(max(math.dist(ecef_km(*p), ecef_km(*q)) for p, q in zip(a, b)), 1.0, t)

    def test_shadow_packets(self):
        self.assertTrue(self.shadow[0] < self.packets_interval[0] < self.packets_interval[1] < self.shadow[1])
        packets = [json.loads(p.to_json()) for p in self.packets]
        vertices, polygon = packets[:-1], packets[-1]
        self.assertEqual(len(vertices), 12)
        self.assertEqual(polygon['id'], 'umbral_shadow_2027-02-06')
        self.assertEqual(polygon['polygon']['positions']['references'],
                         [v['id'] + '#position' for v in vertices])
        self.assertEqual(polygon['polygon']['material']['solidColor']['color']['rgba'], [0, 0, 0, 160])
        samples = vertices[0]['position']['cartographicDegrees']
        times = samples[0::4]
        self.assertEqual(times, sorted(times))
        self.assertTrue(all(-180 <= lon <= 180 for lon in samples[1::4]))
        self.assertTrue(all(-90 <= lat <= 90 for lat in samples[2::4]))

    # The document clock is extended to cover the whole shadow
    def test_clock_covers_shadow(self):
        doc = json.loads(self.track.czml(extra_packets=self.packets, extra_interval=self.packets_interval).dumps())
        self.assertEqual(doc[0]['clock']['interval'], '2027-02-06T14:03:53Z/2027-02-06T17:55:25Z')
