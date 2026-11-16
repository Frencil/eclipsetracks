"""Scrape NASA eclipse path tables and render eclipse tracks as CZML.

Source: https://eclipse.gsfc.nasa.gov/solar.html
Eclipse Predictions by Fred Espenak, NASA's GSFC
"""

import datetime
import json
import re

from czml3 import Document, Packet
from czml3.properties import (
    Clock,
    Material,
    Polygon,
    Polyline,
    PolylineMaterial,
    PositionList,
)
from czml3.types import IntervalValue

from .common import CZML_VERSION, TRACK_FILL_RGBA, TRACK_CENTRAL_RGBA, TRACK_LIMIT_RGBA, read_cached, solid


class EclipseTrack:

    _properties = ('date', 'columns', 'url', 'type', 'limits',
                   'time', 'position', 'ms_diam_ratio',
                   'sun_altitude', 'sun_azimuth',
                   'path_width', 'central_line_duration')

    def __init__(self, date):

        self.date = date
        self.url = None
        self.type = 'unknown'
        self.columns = [ 'Time','NorthLimitLat', 'NorthLimitLon', 'SouthLimitLat', 'SouthLimitLon', 'CentralLat', 'CentralLon',
                         'MSDiamRatio', 'SunAltitude', 'SunAzimuth', 'PathWidth', 'CentralLineDuration' ]
        self.time = []
        self.position = { 'north': [], 'south': [], 'central': [] }
        self.ms_diam_ratio = []
        self.sun_altitude = []
        self.sun_azimuth = []
        self.path_width = []
        self.central_line_duration = []
        self.limits = { 'north': [], 'south': [], 'central': [], 'ms_diam_ratio': [],
                        'sun_altitude': [], 'sun_azimuth': [], 'path_width': [], 'central_line_duration': [] }

    def setTypeFromURL(self, url):
        if re.search(r"Apath\.html$", url):
            self.type = 'annular'
        elif re.search(r"Hpath\.html$", url):
            self.type = 'hybrid'
        elif re.search(r"Tpath\.html$", url):
            self.type = 'total'

    # Load from the downloaded page cache (see `eclipsescraper fetch`); never hits the network
    def loadFromCache(self, url, cache_dir):
        self.url = url
        self.setTypeFromURL(url)
        self.loadFromRawHTML(read_cached(url, cache_dir))

    def loadFromRawHTML(self, rawhtml):
        p1 = rawhtml.partition('<pre>')
        p2 = p1[2].partition('</pre>')
        html = p2[0].strip()
        if len(html) == 0:
            raise Exception('raw data string not found between <pre> tags')
        else:
            self.parseHTML(html)

    def parseHTML(self, html):
        allrows = re.sub(r'\r', r'\n', html).split('\n')
        first_limits = False
        for row in allrows:
            if "Limits" in row:
                first_limits = True
            if first_limits and len(self.limits['north']) < 2:
                row_stripped = row.strip()
                if len(row_stripped) > 0:
                    row_split = self.preparseHyphens(re.split(r'\s+', row_stripped))
                    self.parse_row(row_split)

    def __str__(self):
        return json.dumps(self.__dict__)

    @property
    def properties(self):
        return self._properties

    def data(self):
        d = {}
        for attr in self.properties:
            a = getattr(self, attr)
            if a is not None:
                d[attr] = a
        return d

    # Expand some single hyphens to two fields
    """ Sometimes a single hyphen will be used to denote a lack of a waypoint but this breaks the parsing
        when we expect each waypoint to be two values separated by whitespace. This function detects
        single hyphens that are placeholders for waypoints and replaces them with two spaced ?s.
        NOTE: Only waypoints apply - sometimes single hyphens are placeholders for other values and that
              alone doesn't break parsing. Hence we only check for hyphens between list indexes 0 and 6.
        This is incredibly hacky, but such is the nature of parsing quirky upstream data."""
    def preparseHyphens(self, row):
        try:
            while (row.index('-') > 0) and (row.index('-') < 6):
                index = row.index('-')
                row[index] = '?'
                row.insert(index+1, '?')
            return row
        except ValueError:
            return row

    # Generic function for converting points in degrees with cardinal direction numbers to floats
    def parseLatLon(self, v1, v2):
        try:
            val = float(v1) + (float(v2.rstrip('NESW'))/60)
            if v2.endswith('S') or v2.endswith('W'):
                val *= -1
            return round(val,3)
        except ValueError:
            return None

    # Parse an individual row, validate all values, store in data structures
    def parse_row(self, row):

        parsed_row = []

        def get(column, row):
            def func_not_found(row):
                return None
            try:
                func = getattr(self,column,func_not_found)
                return func(row)
            except IndexError:
                return None

        for column in self.columns:
            val = get(column, row)
            parsed_row.append(val)

        if parsed_row[0] is None:
            return None

        time = parsed_row[0]
        if (parsed_row[1] is not None) and (parsed_row[2] is not None):
            north = (parsed_row[2], parsed_row[1])
        else:
            north = None
        if (parsed_row[3] is not None) and (parsed_row[4] is not None):
            south = (parsed_row[4], parsed_row[3])
        else:
            south = None
        if (parsed_row[5] is not None) and (parsed_row[6] is not None):
            central = (parsed_row[6], parsed_row[5])
        else:
            central = None
        ms_diam_ratio = parsed_row[7]
        sun_altitude = parsed_row[8]
        sun_azimuth = parsed_row[9]
        path_width = parsed_row[10]
        central_line_duration = parsed_row[11]

        if (time == 'Limits'):
            self.limits['north'].append(north)
            self.limits['south'].append(south)
            self.limits['central'].append(central)
            self.limits['ms_diam_ratio'].append(ms_diam_ratio)
            self.limits['sun_altitude'].append(sun_altitude)
            self.limits['sun_azimuth'].append(sun_azimuth)
            self.limits['path_width'].append(path_width)
            self.limits['central_line_duration'].append(central_line_duration)
        else:
            if north is not None and central is not None and south is not None:
                self.time.append(time)
                self.position['north'].append(north)
                self.position['south'].append(south)
                self.position['central'].append(central)
                self.ms_diam_ratio.append(ms_diam_ratio)
                self.sun_altitude.append(sun_altitude)
                self.sun_azimuth.append(sun_azimuth)
                self.path_width.append(path_width)
                self.central_line_duration.append(central_line_duration)
            else:
                return None

        return parsed_row

    # Functions to be called dynamically to extract individual values from the row
    def Time(self, row):
        return row[0]

    def NorthLimitLat(self, row):
        return self.parseLatLon(row[1],row[2])

    def NorthLimitLon(self, row):
        return self.parseLatLon(row[3],row[4])

    def SouthLimitLat(self, row):
        return self.parseLatLon(row[5],row[6])

    def SouthLimitLon(self, row):
        return self.parseLatLon(row[7],row[8])

    def CentralLat(self, row):
        return self.parseLatLon(row[9],row[10])

    def CentralLon(self, row):
        return self.parseLatLon(row[11],row[12])

    def MSDiamRatio(self, row):
        try:
            return float(row[13])
        except ValueError:
            return None

    def SunAltitude(self, row):
        try:
            return float(row[14])
        except ValueError:
            return None

    def SunAzimuth(self, row):
        try:
            return float(row[15])
        except ValueError:
            return None

    def PathWidth(self, row):
        try:
            return float(row[16])
        except ValueError:
            return None

    def CentralLineDuration(self, row):
        return row[17]

    # Resolve each tabulated HH:MM time to a full UTC datetime.
    # The event date is the date of greatest eclipse, but a track can cross 00:00 UT, in
    # which case the HH:MM values wrap. Greatest eclipse is approximated as the row with
    # the highest sun altitude; rows on the far side of the wrap from it shift by a day.
    def datetimes(self):
        minutes = [int(t[0:2]) * 60 + int(t[3:5]) for t in self.time]
        day = [0] * len(minutes)
        for i in range(1, len(minutes)):
            day[i] = day[i-1] + (1 if minutes[i] < minutes[i-1] else 0)
        if day and day[-1] > 0:
            altitudes = [a if a is not None else -1 for a in self.sun_altitude]
            greatest = altitudes.index(max(altitudes))
            day = [d - day[greatest] for d in day]
        midnight = datetime.datetime.combine(self.date, datetime.time(0, 0), tzinfo=datetime.timezone.utc)
        return [midnight + datetime.timedelta(days=d, minutes=m) for d, m in zip(day, minutes)]

    # Generate a point 10km above the center of the track for positioning a camera
    def getCameraPosition(self):
        index = int(round(len(self.position['central'])/2))
        position = self.position['central'][index]
        return [position[0], position[1], 10000000.0]

    # Examine the track to determine what large-scale "regions" the track covers
    def getRegions(self):
        # Each region is defined as bounding limits of south, north, west, east (in that order)
        possible_regions = { 'north atlantic': [0, 60, -70, -10],
                             'south atlantic': [-60, 0, -50, 10],
                             'north pacific': [0, 50, 140, -120],
                             'south pacific': [-70, 0, 170, -80],
                             'indian ocean': [-60, 20, 50, 100],
                             'arctic': [60, 90, 0, 0],
                             'north america': [20, 80, -140, -60],
                             'central america': [7, 30, -120, -60],
                             'south america': [-60, 10, -80, -25],
                             'europe': [35, 70, -10, 45],
                             'northern africa': [5, 35, -17, 50],
                             'southern africa': [-35, 5, 10,50],
                             'middle east': [12, 50, 30, 75],
                             'northern asia': [45, 70, 45, 180],
                             'eastern asia': [20, 45, 75, 145],
                             'southeastern asia': [-10, 20, 75, 160],
                             'australia / new zealand': [-60, -10, 110, 180],
                             'antarctica': [-90, -60, 0, 0],
                             }
        active_regions = []
        for region in possible_regions:
            in_region = False
            region_range = possible_regions[region]
            for position in self.position['central']:
                in_lat = region_range[0] < position[1] < region_range[1]
                if region_range[2] == region_range[3]:
                    in_lon = True
                elif region_range[2] > region_range[3]:
                    in_lon = region_range[2] < position[0] < 180 or -180 < position[0] < region_range[3]
                else:
                    in_lon = region_range[2] < position[0] < region_range[3]
                if in_lat and in_lon:
                    in_region = True
                    break
            if in_region:
                active_regions.append(region)
        return sorted(active_regions)

    # Generate a JSON metadata object (for useful values that can't be represented in CZML)
    def json(self):
        obj = {'iso':  self.date.isoformat(),
               'type': self.type,
               'camera_position': self.getCameraPosition(),
               'regions': self.getRegions(),
               }
        return obj

    # The UTC interval covered by the path table, as ISO 8601 strings
    def interval(self):
        datetimes = self.datetimes()
        return tuple(d.strftime("%Y-%m-%dT%H:%M:%SZ") for d in (datetimes[0], datetimes[-1]))

    # Generate a CZML document for rendering this track. The clock covers the path table's
    # times, extended to cover extra_interval (UTC datetimes) if given, e.g. the whole time the
    # umbral shadow (a separate CZML document with no clock) is on the Earth.
    def czml(self, extra_interval=None):

        iso = self.date.isoformat()
        start, end = self.interval()
        if extra_interval is not None:
            fmt = "%Y-%m-%dT%H:%M:%SZ"
            # Round outward to whole seconds; ISO strings in this format sort chronologically
            start = min(start, extra_interval[0].replace(microsecond=0).strftime(fmt))
            end = max(end, (extra_interval[1].replace(microsecond=0) + datetime.timedelta(seconds=1)).strftime(fmt))

        # Polyline waypoints for the northern limit, central line, and southern limit
        north_polyline_degrees = []
        central_polyline_degrees = []
        south_polyline_degrees = []
        for t in range(len(self.time)):
            north_polyline_degrees += [self.position['north'][t][0], self.position['north'][t][1], 0.0]
            central_polyline_degrees += [self.position['central'][t][0], self.position['central'][t][1], 0.0]
            south_polyline_degrees += [self.position['south'][t][0], self.position['south'][t][1], 0.0]

        # Generate a list of positions representing the track as an enclosed polygon
        track_polygon_positions = list(north_polyline_degrees)
        for offset in range(len(south_polyline_degrees) - 3, -1, -3):
            track_polygon_positions += south_polyline_degrees[offset:offset+3]

        packets = [
            Packet(
                id="document",
                version=CZML_VERSION,
                name="EclipseTracks.org %s" % (iso),
                clock=IntervalValue(
                    start=start,
                    end=end,
                    value=Clock(
                        currentTime=start,
                        multiplier=300,
                        range="LOOP_STOP",
                        step="SYSTEM_CLOCK_MULTIPLIER",
                    ),
                ),
            ),
            # Render track as polygon fill with polylines for north, central, and south
            Packet(
                id="track_length_fill_%s" % (iso),
                polygon=Polygon(
                    show=True,
                    material=Material(solidColor=solid(TRACK_FILL_RGBA)),
                    positions=PositionList(cartographicDegrees=track_polygon_positions),
                ),
            ),
        ]
        for line_id, degrees, rgba in (
            ("track_north_line", north_polyline_degrees, TRACK_LIMIT_RGBA),
            ("track_central_line", central_polyline_degrees, TRACK_CENTRAL_RGBA),
            ("track_south_line", south_polyline_degrees, TRACK_LIMIT_RGBA),
        ):
            packets.append(
                Packet(
                    id="%s_%s" % (line_id, iso),
                    polyline=Polyline(
                        show=True,
                        clampToGround=True,
                        width=2,
                        material=PolylineMaterial(solidColor=solid(rgba)),
                        positions=PositionList(cartographicDegrees=degrees),
                    ),
                )
            )

        return Document(packets=packets)
