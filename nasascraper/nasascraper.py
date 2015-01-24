#!/usr/bin/python

import urllib3
import eclipsetrack

# GET data as HTML
http = urllib3.PoolManager()
r = http.request('GET', 'http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2017Aug21Tpath.html')
if r.status != 200:
  print 'die'

# The data set is always contained entirely within the first set of <pre></pre> tags
p1 = r.data.partition('<pre>');
p2 = p1[2].partition('</pre>');
rawdata = p2[0].strip()
track = eclipsetrack.eclipsetrack(rawdata)

#print track.waypoints
print len(track.waypoints)
print track.waypoints[0]

'''
['16:50', 41.495, -164.505, 41.42, -161.40666666666667, 41.486666666666665, -162.85, 1.018, 7.0, 7.0, 7.0, '01m01.6s']
'''
