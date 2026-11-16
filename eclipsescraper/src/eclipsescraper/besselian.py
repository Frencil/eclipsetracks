"""Scrape and evaluate NASA polynomial Besselian elements for solar eclipses.

Pages look like https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Feb06Abeselm.html
and are the companions of the path tables scraped by track.py.

Each element a (x, y, d, l1, l2, mu) is a polynomial in t = t1 - t0 (decimal hours of TDT):
    a = a0 + a1*t + a2*t^2 + a3*t^3
x, y, l1, l2 are in units of Earth's equatorial radius; d and mu are in degrees.
"""

import datetime
import html
import math
import re

ELEMENTS = ("x", "y", "d", "l1", "l2", "mu")

# Julian Date of the Unix epoch
_JD_UNIX_EPOCH = 2440587.5


def beselm_url(path_url):
    """Derive the Besselian elements page URL from a path table URL."""
    url, n = re.subn(
        r"SEpath/SEpath(\d+)/(SE\d{4}[A-Za-z]{3}\d{2}[A-Z])path\.html$",
        r"SEbeselm/SEbeselm\1/\2beselm.html",
        path_url,
    )
    if n != 1:
        raise ValueError("Not a recognized NASA path table URL: " + path_url)
    return re.sub(r"^http:", "https:", url)


def _jd_to_datetime(jd):
    return datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc) + datetime.timedelta(
        days=jd - _JD_UNIX_EPOCH
    )


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-5] + "Z"


def _search(pattern, text, what):
    m = re.search(pattern, text, re.DOTALL)
    if not m:
        raise ValueError("Unable to find %s in Besselian elements page" % what)
    return m


def parse_beselm_html(rawhtml):
    """Parse a NASA Besselian elements page into a JSON-serializable dict.

    Times are ISO 8601 strings; t0 and greatest_eclipse_tdt are in TDT (written with a Z
    suffix for convenience, but they are NOT UTC). greatest_eclipse_ut is UTC.
    """
    text = html.unescape(re.sub(r"<[^>]+>", "", rawhtml))

    # Greatest eclipse: TDT time with Julian Date, followed by the UT equivalent
    m = _search(
        r"Instant of\s+(\d\d):(\d\d):([\d.]+) TDT\s+J\.D\. =\s*([\d.]+)\s+Greatest Eclipse:\s+\(=(\d\d):(\d\d):([\d.]+) UT\)",
        text, "greatest eclipse",
    )
    ge_tdt = _jd_to_datetime(float(m.group(4)))
    ge_ut_tod = int(m.group(5)) * 3600 + int(m.group(6)) * 60 + float(m.group(7))

    delta_t = float(_search(r"ΔT =\s*([-\d.]+) s", text, "delta T").group(1))
    gamma = float(_search(r"Gamma =\s*([-\d.]+)", text, "gamma").group(1))
    magnitude = float(_search(r"Eclipse Magnitude =\s*([-\d.]+)", text, "magnitude").group(1))
    k1 = float(_search(r"k1 =\s*([\d.]+)", text, "k1").group(1))
    k2 = float(_search(r"k2 =\s*([\d.]+)", text, "k2").group(1))
    tan_f1 = float(_search(r"Tan ƒ1 =\s*([\d.]+)", text, "tan f1").group(1))
    tan_f2 = float(_search(r"Tan ƒ2 =\s*([\d.]+)", text, "tan f2").group(1))

    # t0 hour (TDT). The printed date beside it is the event date, which is NOT always
    # t0's date (e.g. 2052 Sep 22: greatest eclipse 23:39 TDT, t0 = 00:00 TDT the next
    # day), so take t0 as the instance of that hour nearest greatest eclipse.
    t0_hours = float(_search(r"t0 =\s*([\d.]+) TDT", text, "t0").group(1))
    ge_midnight = ge_tdt.replace(hour=0, minute=0, second=0, microsecond=0)
    t0 = min(
        (ge_midnight + datetime.timedelta(days=dd, hours=t0_hours) for dd in (-1, 0, 1)),
        key=lambda c: abs((c - ge_tdt).total_seconds()),
    )

    m = _search(r"valid over the period\s+(-?[\d.]+)\s*≤ t0 ≤\s*(-?[\d.]+) TDT", text, "validity period")
    valid = [((float(v) - t0_hours + 12) % 24) - 12 for v in m.groups()]

    # Polynomial table: rows "n  x y d l1 l2 mu", fewer columns for higher n
    table = _search(r"n\s+x\s+y\s+d\s+l1\s+l2\s+μ\s*\n(.*?)\n\s*Tan", text, "polynomial table").group(1)
    coefficients = {e: [] for e in ELEMENTS}
    for line in table.splitlines():
        parts = line.split()
        if not parts:
            continue
        n, values = int(parts[0]), [float(v) for v in parts[1:]]
        if n != len(coefficients["x"]):
            raise ValueError("Unexpected polynomial row order in Besselian elements page")
        for element, value in zip(ELEMENTS, values):
            coefficients[element].append(value)
    if len(coefficients["x"]) < 2 or any(len(c) < 2 for c in coefficients.values()):
        raise ValueError("Incomplete polynomial table in Besselian elements page")

    # UT of greatest eclipse: TDT minus delta T, cross-checked against the printed UT
    ge_ut = ge_tdt - datetime.timedelta(seconds=delta_t)
    ut_tod = ge_ut.hour * 3600 + ge_ut.minute * 60 + ge_ut.second + ge_ut.microsecond / 1e6
    if abs(((ut_tod - ge_ut_tod + 43200) % 86400) - 43200) > 1:
        raise ValueError("Greatest eclipse UT does not match TDT - delta T")

    return {
        "t0": _iso(t0),
        "valid_hours": valid,
        "delta_t": delta_t,
        "greatest_eclipse_tdt": _iso(ge_tdt),
        "greatest_eclipse_ut": _iso(ge_ut),
        "gamma": gamma,
        "magnitude": magnitude,
        "k1": k1,
        "k2": k2,
        "tan_f1": tan_f1,
        "tan_f2": tan_f2,
        "coefficients": coefficients,
    }


def _parse_iso(s):
    return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))


class BesselianElements:
    """Evaluate polynomial Besselian elements at UTC times."""

    def __init__(self, data):
        self.data = data
        self.t0 = _parse_iso(data["t0"])  # TDT
        self.delta_t = data["delta_t"]
        self.tan_f1 = data["tan_f1"]
        self.tan_f2 = data["tan_f2"]
        self.coefficients = data["coefficients"]
        self.greatest_eclipse_ut = _parse_iso(data["greatest_eclipse_ut"])

    def t(self, utc):
        """Hours of TDT since t0 for a UTC datetime."""
        tdt = utc + datetime.timedelta(seconds=self.delta_t)
        return (tdt - self.t0).total_seconds() / 3600

    def utc(self, t):
        """Inverse of t(): the UTC datetime at t hours from t0."""
        return self.t0 + datetime.timedelta(hours=t, seconds=-self.delta_t)

    def valid_utc(self):
        return tuple(self.utc(h) for h in self.data["valid_hours"])

    def at(self, utc):
        """Element values at a UTC datetime, with d and mu converted to radians."""
        t = self.t(utc)
        v = {e: sum(c * t ** n for n, c in enumerate(cs)) for e, cs in self.coefficients.items()}
        v["d"] = math.radians(v["d"])
        # mu is referred to the ephemeris meridian, which lies 1.002738 * delta T seconds of
        # rotation (0.00417807 * delta T degrees) east of Greenwich. Verified against NASA's
        # path tables (central line and limits agree to their 0.1' rounding).
        v["mu"] = math.radians((v["mu"] - 0.00417807 * self.delta_t) % 360)
        return v
