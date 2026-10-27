"""US geography used by the signal generator and the search-query parser."""

# abbr -> (name, (three cities), area code)
US_STATES: dict[str, tuple[str, tuple[str, str, str], str]] = {
    "AL": ("Alabama", ("Birmingham", "Huntsville", "Mobile"), "205"),
    "AK": ("Alaska", ("Anchorage", "Fairbanks", "Juneau"), "907"),
    "AZ": ("Arizona", ("Phoenix", "Tucson", "Mesa"), "602"),
    "AR": ("Arkansas", ("Little Rock", "Fayetteville", "Fort Smith"), "501"),
    "CA": ("California", ("Los Angeles", "San Diego", "Sacramento"), "213"),
    "CO": ("Colorado", ("Denver", "Colorado Springs", "Aurora"), "303"),
    "CT": ("Connecticut", ("Hartford", "New Haven", "Stamford"), "203"),
    "DE": ("Delaware", ("Wilmington", "Dover", "Newark"), "302"),
    "FL": ("Florida", ("Miami", "Tampa", "Orlando"), "305"),
    "GA": ("Georgia", ("Atlanta", "Savannah", "Augusta"), "404"),
    "HI": ("Hawaii", ("Honolulu", "Hilo", "Kailua"), "808"),
    "ID": ("Idaho", ("Boise", "Meridian", "Idaho Falls"), "208"),
    "IL": ("Illinois", ("Chicago", "Naperville", "Springfield"), "312"),
    "IN": ("Indiana", ("Indianapolis", "Fort Wayne", "Evansville"), "317"),
    "IA": ("Iowa", ("Des Moines", "Cedar Rapids", "Davenport"), "515"),
    "KS": ("Kansas", ("Wichita", "Overland Park", "Topeka"), "316"),
    "KY": ("Kentucky", ("Louisville", "Lexington", "Bowling Green"), "502"),
    "LA": ("Louisiana", ("New Orleans", "Baton Rouge", "Shreveport"), "504"),
    "ME": ("Maine", ("Portland", "Bangor", "Augusta"), "207"),
    "MD": ("Maryland", ("Baltimore", "Frederick", "Rockville"), "410"),
    "MA": ("Massachusetts", ("Boston", "Worcester", "Springfield"), "617"),
    "MI": ("Michigan", ("Detroit", "Grand Rapids", "Ann Arbor"), "313"),
    "MN": ("Minnesota", ("Minneapolis", "St. Paul", "Rochester"), "612"),
    "MS": ("Mississippi", ("Jackson", "Gulfport", "Biloxi"), "601"),
    "MO": ("Missouri", ("St. Louis", "Kansas City", "Springfield"), "314"),
    "MT": ("Montana", ("Billings", "Missoula", "Bozeman"), "406"),
    "NE": ("Nebraska", ("Omaha", "Lincoln", "Bellevue"), "402"),
    "NV": ("Nevada", ("Las Vegas", "Reno", "Henderson"), "702"),
    "NH": ("New Hampshire", ("Manchester", "Nashua", "Concord"), "603"),
    "NJ": ("New Jersey", ("Newark", "Jersey City", "Princeton"), "201"),
    "NM": ("New Mexico", ("Albuquerque", "Santa Fe", "Las Cruces"), "505"),
    "NY": ("New York", ("New York", "Buffalo", "Albany"), "212"),
    "NC": ("North Carolina", ("Charlotte", "Raleigh", "Durham"), "704"),
    "ND": ("North Dakota", ("Fargo", "Bismarck", "Grand Forks"), "701"),
    "OH": ("Ohio", ("Columbus", "Cleveland", "Cincinnati"), "216"),
    "OK": ("Oklahoma", ("Oklahoma City", "Tulsa", "Norman"), "405"),
    "OR": ("Oregon", ("Portland", "Eugene", "Salem"), "503"),
    "PA": ("Pennsylvania", ("Philadelphia", "Pittsburgh", "Harrisburg"), "215"),
    "RI": ("Rhode Island", ("Providence", "Warwick", "Cranston"), "401"),
    "SC": ("South Carolina", ("Charleston", "Columbia", "Greenville"), "803"),
    "SD": ("South Dakota", ("Sioux Falls", "Rapid City", "Aberdeen"), "605"),
    "TN": ("Tennessee", ("Nashville", "Memphis", "Knoxville"), "615"),
    "TX": ("Texas", ("Houston", "Austin", "Dallas"), "713"),
    "UT": ("Utah", ("Salt Lake City", "Provo", "Ogden"), "801"),
    "VT": ("Vermont", ("Burlington", "Montpelier", "Rutland"), "802"),
    "VA": ("Virginia", ("Richmond", "Virginia Beach", "Norfolk"), "757"),
    "WA": ("Washington", ("Seattle", "Spokane", "Tacoma"), "206"),
    "WV": ("West Virginia", ("Charleston", "Morgantown", "Huntington"), "304"),
    "WI": ("Wisconsin", ("Milwaukee", "Madison", "Green Bay"), "414"),
    "WY": ("Wyoming", ("Cheyenne", "Casper", "Laramie"), "307"),
}

# States used when a request does not name one (keeps the demo feed geographically varied).
POPULAR_STATES = ["FL", "TX", "CA", "NY", "IL", "GA", "AZ", "NC", "OH", "PA", "WA", "MA", "CO", "NV", "TN"]

STATE_BY_NAME = {name.lower(): abbr for abbr, (name, _c, _a) in US_STATES.items()}


def normalize_state(value: str | None) -> str | None:
    """Accepts 'FL', 'fl' or 'Florida'; returns the 2-letter code or None."""
    if not value:
        return None
    v = value.strip()
    if v.upper() in US_STATES:
        return v.upper()
    return STATE_BY_NAME.get(v.lower())
