# Store search positions of robertosan16 actors (first 500). Usage: python3 rank.py "indeed" "google trends api"
import json,sys,urllib.request,urllib.parse
qs=sys.argv[1:]
for q in qs:
    found={};total=None
    for off in range(0,500,100):
        u="https://api.apify.com/v2/store?"+urllib.parse.urlencode({"search":q,"limit":100,"offset":off})
        d=json.load(urllib.request.urlopen(u))["data"];total=d["total"]
        for i,a in enumerate(d["items"],off+1):
            if a["username"]=="robertosan16": found[a["name"]]=i
        if not d["items"]: break
    print(f"{q!r:32} total={total:5} ours={found}")
