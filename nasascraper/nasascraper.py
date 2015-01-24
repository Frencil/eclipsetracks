#!/usr/bin/python

import urllib3
import eclipsetrack
from datetime import date

# Manually curated list of tuples for date / URL of various eclipse events available on NASA's website
eclipses = [ (date(2015, 3, 20), 'http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2015Mar20Tpath.html'),
             (date(2016, 3, 9),  'http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2016Mar09Tpath.html'),
             (date(2017, 8, 21), 'http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2017Aug21Tpath.html'),
             (date(2019, 7, 2),  'http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2019Jul02Tpath.html') ]

czmls = []

# Loop through eclipses, GET raw HTML data, and parse them into eclipsetrack objects
http = urllib3.PoolManager()
for idx, eclipse in enumerate(eclipses):

  # Attempt to pull down HTML
  r = http.request('GET', eclipse[1])
  if r.status != 200:
    print 'Unable to load eclipse event: ' + eclipse[0].isoformat()
    continue

  # Attempt to extract a raw data string out of that HTML
  try:
    p1 = r.data.partition('<pre>');
    p2 = p1[2].partition('</pre>');
    rawdata = p2[0].strip()
    if len(rawdata) == 0:
      raise Exception('raw data string not found between <pre> tags')
  except:
    print 'Unable to extract raw data string for event: ' + eclipse[0].isoformat()
    continue

  # Attempt to parse raw data string into an eclipsetrack object
  try:
    track = eclipsetrack.eclipsetrack(rawdata)
  except:
    print 'Unable to parse raw data string into track for event: ' + eclipse[0].isoformat()
    continue

  # Attempt to generate a CZML file for the track
  '''
  ['16:50', 41.495, -164.505, 41.42, -161.40666666666667, 41.486666666666665, -162.85, 1.018, 7.0, 7.0, 7.0, '01m01.6s']
  '''

  #print track.waypoints
  print eclipse[0].isoformat()
  print len(track.waypoints)
  print track.waypoints[0]

