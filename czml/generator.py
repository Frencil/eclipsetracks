#!/usr/bin/python

# Use eclipsescraper to scrape eclipse track data from NASA
# http://eclipse.gsfc.nasa.gov/eclipse.html
# Eclipse Predictions by Fred Espenak, NASA's GSFC

import re, json, datetime, traceback

try:
    from eclipsescraper import eclipsescraper
except ImportError:
    import eclipsescraper

events = open("events.txt", "r")

for event_line in events:
    
    event = re.split(',', event_line)
    iso = event[0].strip()
    url = event[1].strip()

    if len(iso) < 1 or len(url) < 1:
        continue

    try:
        date = datetime.datetime.strptime(iso, "%Y-%m-%d").date()
        track = eclipsescraper.EclipseTrack(date)
        track.loadFromURL(url)
        czml = track.czml()
        czml_filename = track.date.strftime("%Y-%m-%d") + ".czml"
        with open(czml_filename, 'w') as outfile:
            json.dump(czml, outfile)
            print("Wrote " + czml_filename)

    except Exception:
        print("Error on ISO: " + iso)
        traceback.print_exc()
        continue
