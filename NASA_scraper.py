#!/usr/bin/python

import re
import urllib3

# define a row parser class
class EclipseTrack:

  parsing_row = []
  waypoints = []
  columns = [ 'Time','NorthLimitLat', 'NorthLimitLon', 'SouthLimitLat', 'SouthLimitLon', 'CentralLat', 'CentralLon',
              'MSDiamRatio', 'SunAltitude', 'SunAzimuth', 'PathWidth', 'CentralLineDuration' ]

  def __init__(self, rawdata):
    allrows = rawdata.split('\r')
    limits = 0
    for row in allrows:
      if 'Limits' in row:
        limits += 1
      elif limits == 1:
        row_stripped = row.strip()
        if len(row_stripped) > 0:
          row_split = re.split('\s+',row_stripped)
          row_parsed = self.parse_row(row_split)
          self.waypoints.append(row_parsed)

  def parse_row(self, row):

    parsed_row = []

    def get(column, row):

      def func_not_found(row):
        print 'returning nothing. =('
        return ''

      def Time(row):
        print 'returning Time'
        return row[0]

      func = getattr(self,column,func_not_found)
      return func(row)

    for column in self.columns:
      if column == 'Time':
        parsed_row.append(get(column, row))
    return parsed_row



# GET data as HTML
http = urllib3.PoolManager()
r = http.request('GET', 'http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2017Aug21Tpath.html')
if r.status != 200:
  print 'die'

# The data set is always contained entirely within the first set of <pre></pre> tags
p1 = r.data.partition('<pre>');
p2 = p1[2].partition('</pre>');
rawdata = p2[0].strip()
track = EclipseTrack(rawdata)

print track
print track.waypoints
#print len(track.waypoints)
#print track.waypoints[0]

'''
Universal  Northern Limit      Southern Limit       Central Line     Diam.  Sun Sun Path   Line
         ------------------  ------------------  ------------------  Ratio  Alt Azm Width Durat.
  Time   Latitude Longitude  Latitude Longitude  Latitude Longitude

 0       1  2     3   4      5  6     7   8      9  10    11  12     13      14  15  16  17
 Limits  39 59.7N 171 44.9W  39 28.8N 171 26.0W  39 44.2N 171 35.4W  1.016   0   -   62  00m51.6s
'''

'''
// Convert the CSV-formatted string for all eclipse track times and waypoints to an
// object that structures the data such that it can be easily passed into API methods
console.log("waypoints:");
var eclipseTracks = {
    'csvData': [],
    'northPositions': [],
    'southPositions': [],
    'centralPositions': []
}
var dump = "";
var csvRows = eclipseTrackCSV.split('\n');
var csvLabels = csvRows[0].split(',');
for (var i = 1; i < csvRows.length; i++){
    var csvRow = csvRows[i].split(',');
    var csvRowObject = new Object();
    for (var j = 0; j < csvLabels.length; j++){
        // In our data set we have time and lat/lon values. Only time can be copied to the
        // data object without interpretation; the lat/lon values need to be cleaned up.
        if (csvLabels[j] == 'Time' || csvLabels[j] == 'PathWidth'){
            csvRowObject[csvLabels[j]] = csvRow[j];
        } else {
            var waypointObject = csvRow[j].split(' ');
            var waypointValue  = parseFloat(waypointObject[0]) + (parseFloat(waypointObject[1])/60);
            if (waypointObject[1].indexOf('W') != -1){ waypointValue *= -1; }
            csvRowObject[csvLabels[j]] = waypointValue;
        }
    }
    eclipseTracks.csvData.push(csvRowObject);
    eclipseTracks.northPositions.push(csvRowObject.NorthLimitLon,csvRowObject.NorthLimitLat)
    eclipseTracks.southPositions.push(csvRowObject.SouthLimitLon,csvRowObject.SouthLimitLat)
    eclipseTracks.centralPositions.push(csvRowObject.CentralLon,csvRowObject.CentralLat)
    //dump += '"2017-08-21T' + csvRowObject.Time + ':00Z", ' + csvRowObject.CentralLon.toFixed(3) + ", " + csvRowObject.CentralLat.toFixed(3) + ", 0.0,\n";
    dump += '"2017-08-21T' + csvRowObject.Time + ':00Z", ' + ((csvRowObject.PathWidth/2)*1000) + ",\n";
}
console.log(dump);
'''
