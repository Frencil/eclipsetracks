"""Normalize CZML so documents can be compared by meaning rather than serialization.

Time-tagged sample arrays may be written either with ISO 8601 time strings inline or as
seconds offsets from an `epoch`. Both are converted to absolute UTC datetimes here.
"""

import datetime

# Property keys whose values may be time-tagged sample arrays, with values per sample
SAMPLED = {"cartographicDegrees": 3, "number": 1}


def _parse(t):
    return datetime.datetime.fromisoformat(t.replace("Z", "+00:00"))


def _samples(values, width, epoch):
    if not isinstance(values, list) or len(values) % (width + 1) != 0:
        return values
    times = values[:: width + 1]
    if all(isinstance(t, str) for t in times):
        absolute = [_parse(t) for t in times]
    elif epoch is not None and all(isinstance(t, (int, float)) for t in times):
        absolute = [_parse(epoch) + datetime.timedelta(seconds=t) for t in times]
    else:
        return values
    out = []
    for i, t in enumerate(absolute):
        out.append((t, *values[i * (width + 1) + 1 : (i + 1) * (width + 1)]))
    return out


def normalize_czml(obj, epoch=None):
    if isinstance(obj, list):
        return [normalize_czml(o) for o in obj]
    if not isinstance(obj, dict):
        return obj
    epoch = obj.get("epoch", epoch)
    out = {}
    for key, value in obj.items():
        if key == "epoch":
            continue
        if key in SAMPLED and isinstance(value, list) and (epoch or any(isinstance(v, str) for v in value)):
            out[key] = _samples(value, SAMPLED[key], epoch)
        else:
            out[key] = normalize_czml(value, epoch)
    return out
