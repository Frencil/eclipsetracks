#!/usr/bin/python

# Use eclipsescraper to scrape eclipse track data from NASA
# http://eclipse.gsfc.nasa.gov/eclipse.html
# Eclipse Predictions by Fred Espenak, NASA's GSFC

import json, csv, datetime, traceback

try:
    from eclipsescraper import eclipsescraper
except ImportError:
    import eclipsescraper

with open("events.txt", "r") as events:

    reader = csv.reader(events, delimiter=',')
    for row in reader:

        iso = row[0]
        url = row[1]

        try:

            date = datetime.datetime.strptime(iso, "%Y-%m-%d").date()
            track = eclipsescraper.EclipseTrack(date)
            track.loadFromURL(url)
            iso2 = track.date.strftime("%Y-%m-%d")

            track_czml = track.czml()
            czml_filename = iso2 + ".czml"
            with open(czml_filename, 'w') as outfile:
                json.dump(track_czml, outfile)
                print("Wrote " + czml_filename)

                track_json = track.json()
                json_filename = iso2 + ".json"
                with open(json_filename, 'w') as outfile:
                    json.dump(track_json, outfile)
                    print("Wrote " + json_filename)

        except Exception:
            print("Error on ISO: " + iso)
            traceback.print_exc()
            continue
