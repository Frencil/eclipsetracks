#!/usr/bin/python

# Scrape eclipse track data from NASA
# http://eclipse.gsfc.nasa.gov/eclipse.html
# Eclipse Predictions by Fred Espenak, NASA's GSFC

import re, math, json, csv, datetime, traceback
from geopy.distance import geodesic

import urllib.request

from czml3 import Document, Packet, Preamble

from czml3.properties import (
    Clock,
    Color,
    Ellipse,
    Material,
    Polygon,
    Polyline,
    PositionList,
    SolidColorMaterial,
)

from czml3.types import IntervalValue

VERSION="1.1"

def addition(a, b):  
    return a + b  

class EclipseTrack:

    _properties = ('date', 'columns', 'url', 'type', 'limits',
                   'time', 'position', 'ms_diam_ratio',
                   'sun_altitude', 'sun_azimuth',
                   'path_width', 'central_line_duration')

    # Start by taking a raw data string and parsing it build the waypoints list
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

    def loadFromURL(self, url):
        self.url = url
        iso = self.date.isoformat()

        # Extract eclipse type from URL
        annular = re.search(r"Apath\.html$",self.url)
        hybrid = re.search(r"Hpath\.html$",self.url)
        total = re.search(r"Tpath\.html$",self.url)
        if annular:
            self.type = 'annular'
        elif hybrid:
            self.type = 'hybrid'
        elif total:
            self.type = 'total'

        r = urllib.request.urlopen(self.url)
        if r.status != 200:
            raise Exception('Unable to load eclipse event: ' + iso + ' (URL: ' + self.url + ')')
        else:
            html = r.read().decode('utf-8','ignore')
        
        self.loadFromRawHTML(html)

    def loadFromRawHTML(self, rawhtml):
        p1 = rawhtml.partition('<pre>');
        p2 = p1[2].partition('</pre>');
        html = p2[0].strip()
        if len(html) == 0:
            raise Exception('raw data string not found between <pre> tags')
        else:
            self.parseHTML(html)

    def parseHTML(self, html):
        allrows = re.sub(r'\r',r'\n',html).split('\n')
        first_limits = False
        for row in allrows:
            if "Limits" in row:
                first_limits = True
            if first_limits and len(self.limits['north']) < 2:
                row_stripped = row.strip()
                if len(row_stripped) > 0:
                    row_split = self.preparseHyphens(re.split('\s+',row_stripped))
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

        if (parsed_row[0] == None):
            return None;
        else:
            time = parsed_row[0]
            if (parsed_row[1] != None) and (parsed_row[2] != None):
                north = (parsed_row[2], parsed_row[1])
            else:
                north = None
            if (parsed_row[3] != None) and (parsed_row[4] != None):
                south = (parsed_row[4], parsed_row[3])
            else:
                south = None
            if (parsed_row[5] != None) and (parsed_row[6] != None):        
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
            if north != None and central != None and south != None:
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
            val = float(row[13])
            return val
        except ValueError:
            return None

    def SunAltitude(self, row):
        try:
            val = float(row[14])
            return val
        except ValueError:
            return None

    def SunAzimuth(self, row):
        try:
            val = float(row[15])
            return val
        except ValueError:
            return None

    def PathWidth(self, row):
        try:
            val = float(row[16])
            return val
        except ValueError:
            return None

    def CentralLineDuration(self, row):
        return row[17]

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
                    break;
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

    # Generate a CZML document for rendering ONLY this track
    def czml(self):

        iso = self.date.isoformat()

        # Initialize document with clock
        start = iso + "T" + self.time[0] + ":00Z"
        end = iso + "T" + self.time[-1] + ":00Z"

        doc = [];
        doc.append(
            Preamble(
                version=VERSION,
                name="EclipseTracks.org %s" % (iso),
                clock=IntervalValue(
                    start=start,
                    end=end,
                    value=Clock(
                        currentTime=start,
                        multiplier=300,
                        range="LOOP_STOP",
                        step="SYSTEM_CLOCK_MULTIPLIER"
                    )
                )
            )
        )

        # TODO: Extract as function
        # Generate time-specific lists for various objects
        central_polyline_degrees = []
        north_polyline_degrees = []
        south_polyline_degrees = []
        ellipse_position = []
        ellipse_semiMajorAxis = []
        ellipse_semiMinorAxis = []
        ellipse_rotation = []

        for t in range(len(self.time)):

            time = iso + "T" + self.time[t] + ":00Z"

            # Define polyline waypoints only where data exist
            if self.position['north'][t] != None:
                north_polyline_degrees += [self.position['north'][t][0], self.position['north'][t][1], 0.0]
            if self.position['central'][t] != None:
                central_polyline_degrees += [self.position['central'][t][0], self.position['central'][t][1], 0.0]
            if self.position['south'][t] != None:
                south_polyline_degrees += [self.position['south'][t][0], self.position['south'][t][1], 0.0]

            # Define ellipse positions and attributes for every time in the interval, using limits where necessary
            use_limit = min(int(math.floor(t/(len(self.time)/2))),1)
            if self.position['north'][t] == None:
                north = self.limits['north'][use_limit]
            else:
                north = self.position['north'][t]
            if self.position['central'][t] == None:
                central = self.limits['central'][use_limit]
            else:
                central = self.position['central'][t]
            if self.position['south'][t] == None:
                south = self.limits['south'][use_limit]
            else:
                south = self.position['south'][t]

            # Approximate ellipse semiMajorAxis from geodesic distance between limit polylines
            north2 = (north[1], north[0])
            south2 = (south[1], south[0])
            semi_major_axis = geodesic(north2, south2).meters / 2

            # Approximate elipse semiMinorAxis from sun altitude (probably way wrong!)
            ellipse_axis_ratio = self.sun_altitude[t] / 90
            semi_minor_axis = semi_major_axis * ellipse_axis_ratio

            # Approximate ellipse rotation using basic spheroid (TODO: replace with WGS-84)
            # Calculate bearing in both directions and average them
            nlat = north[1]/180 * math.pi;
            nlon = north[0]/180 * math.pi;
            clat = central[1]/180 * math.pi;
            clon = central[0]/180 * math.pi;
            slat = south[1]/180 * math.pi;
            slon = south[0]/180 * math.pi;

            y = math.sin(slon-nlon) * math.cos(slat);
            x = math.cos(nlat) * math.sin(slat) - math.sin(nlat) * math.cos(slat) * math.cos(slon-nlon);
            initial_bearing = math.atan2(y, x)
            if (initial_bearing < 0):
                initial_bearing += math.pi * 2

            y = math.sin(nlon-slon) * math.cos(nlat);
            x = math.cos(slat) * math.sin(nlat) - math.sin(slat) * math.cos(nlat) * math.cos(nlon-slon);
            final_bearing = math.atan2(y, x) - math.pi
            if (final_bearing < 0):
                final_bearing += math.pi * 2

            rotation = -1 * ((initial_bearing + final_bearing) / 2 - (math.pi / 2))

            ellipse_position += [time, central[0], central[1], 0.0]
            ellipse_semiMajorAxis += [time, round(semi_major_axis, 3)]
            ellipse_semiMinorAxis += [time, round(semi_minor_axis, 3)]
            ellipse_rotation += [time, round(rotation, 3)]


        # Generate a list of positions representing the track as an enclosed polygon
        track_polygon_positions = list(north_polyline_degrees)
        point = round(len(south_polyline_degrees)/3)
        while (point > 0):
            offset = (point-1) * 3
            track_polygon_positions += [
                south_polyline_degrees[offset],
                south_polyline_degrees[offset+1],
                south_polyline_degrees[offset+2],
            ]
            point -= 1

        # Render track as polygon fill with polylines for north, central, and south
        doc.append(
            Packet(
                id="track_length_fill_%s" % (iso),
                polygon=Polygon(
                    show=True,
                    material=Material(solidColor=SolidColorMaterial(color=Color(rgba=(0, 0, 0, 90)))),
                    positions=PositionList(cartographicDegrees=track_polygon_positions),
                )
            )
        )
        doc.append(
            Packet(
                id="track_north_line_%s" % (iso),
                polyline=Polyline(
                    show=True,
                    clampToGround=True,
                    width=2,
                    material=Material(solidColor=SolidColorMaterial(color=Color(rgba=(232, 72, 68, 255)))),
                    positions=PositionList(cartographicDegrees=north_polyline_degrees),
                )
            )
        )
        doc.append(
            Packet(
                id="track_central_line_%s" % (iso),
                polyline=Polyline(
                    show=True,
                    clampToGround=True,
                    width=2,
                    material=Material(solidColor=SolidColorMaterial(color=Color(rgba=(241, 226, 57, 255)))),
                    positions=PositionList(cartographicDegrees=central_polyline_degrees),
                )
            )
        )
        doc.append(
            Packet(
                id="track_south_line_%s" % (iso),
                polyline=Polyline(
                    show=True,
                    clampToGround=True,
                    width=2,
                    material=Material(solidColor=SolidColorMaterial(color=Color(rgba=(232, 72, 68, 255)))),
                    positions=PositionList(cartographicDegrees=south_polyline_degrees),
                )
            )
        )

        # Render approximated umbral shadow as a moving ellipse
        doc.append(
            Packet(
                id="approximated_umbral_shadow_%s" % (iso),
                position=PositionList(cartographicDegrees=ellipse_position),
                ellipse=Ellipse(
                    show=True,
                    fill=True,
                    granularity=0.002,
                    semiMajorAxis={ "number": ellipse_semiMajorAxis },
                    semiMinorAxis={ "number": ellipse_semiMinorAxis },
                    rotation={ "number": ellipse_rotation },
                    material=Material(solidColor=SolidColorMaterial(color=Color(rgba=(0, 0, 0, 160)))),
                )
            )
        )

        # Done!
        return Document(doc)


# If called from command line then parse events.txt and scrape/generate CZML and JSON files
if __name__ == "__main__":

    czml_path = "../../czml/"
    # LIMIT = 3
    # INC = 0
    with open(czml_path + "events.txt", "r") as events:

        reader = csv.reader(events, delimiter=',')
        for row in reader:

            # INC += 1
            # if INC > LIMIT or INC < 3:
            #     continue

            iso = row[0]
            url = row[1]

            try:

                date = datetime.datetime.strptime(iso, "%Y-%m-%d").date()
                track = EclipseTrack(date)
                track.loadFromURL(url)
                iso2 = track.date.strftime("%Y-%m-%d")

                track_czml = track.czml()
                czml_filename = czml_path + iso2 + ".czml"
                with open(czml_filename, 'w') as outfile:
                    track_czml.dump(outfile)
                    print("Wrote " + czml_filename)

                    track_json = track.json()
                    json_filename = czml_path + iso2 + ".json"
                    with open(json_filename, 'w') as outfile:
                        json.dump(track_json, outfile)
                        print("Wrote " + json_filename)

            except Exception:
                print("Error on ISO: " + iso)
                traceback.print_exc()
                continue