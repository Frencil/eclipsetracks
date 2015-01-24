import re

class eclipsetrack:

  waypoints = []
  columns = [ 'Time','NorthLimitLat', 'NorthLimitLon', 'SouthLimitLat', 'SouthLimitLon', 'CentralLat', 'CentralLon',
              'MSDiamRatio', 'SunAltitude', 'SunAzimuth', 'PathWidth', 'CentralLineDuration' ]

  # Start by taking a raw data string and parsing it build the waypoints list
  def __init__(self, rawdata):
    self.waypoints = []
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
          if row_parsed != None:
            self.waypoints.append(row_parsed)

  # Generic function for converting points in degrees with cardinal direction numbers to floats
  def parseLatLon(self, v1, v2):
    try:
      val = float(v1) + (float(v2.rstrip('NESW'))/60)
      if v2.endswith('S') or v2.endswith('W'):
        val *= -1
      return val
    except ValueError:
      return None

  # Parse an individual row and validate all values
  def parse_row(self, row):

    parsed_row = []

    def get(column, row):
      def func_not_found(row):
        return None
      func = getattr(self,column,func_not_found)
      return func(row)

    for column in self.columns:
      val = get(column, row)
      if val != None:
        parsed_row.append(val)
      else:
        return None
        break

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
      val = float(row[14])
      return val
    except ValueError:
      return None

  def PathWidth(self, row):
    try:
      val = float(row[14])
      return val
    except ValueError:
      return None

  def CentralLineDuration(self, row):
    return row[17]
