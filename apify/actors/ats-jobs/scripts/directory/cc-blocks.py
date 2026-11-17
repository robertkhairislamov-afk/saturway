"""Which blocks of the Common Crawl CDX index hold URLs of the career-site systems.

The cluster index lists the first SURT key of every block (about 3,000 index lines each), sorted.
A prefix's URLs start in the block before its first key and run to the last block whose key starts
with it. Prints the blocks as JSON lines: prefix, file, offset, length.
"""
import bisect
import json
import sys

PREFIXES = {
    'greenhouse': ['io,greenhouse,boards)/', 'io,greenhouse,job-boards)/', 'io,greenhouse,eu,job-boards)/'],
    'lever': ['co,lever,jobs)/', 'co,lever,eu,jobs)/'],
    'ashby': ['com,ashbyhq,jobs)/'],
    'workday': ['com,myworkdayjobs,', 'com,myworkdaysite,'],
    'personio': ['de,personio,jobs,', 'com,personio,jobs,'],
    'teamtailor': ['com,teamtailor,'],
}

idx_path = sys.argv[1]
keys, rows = [], []
with open(idx_path, encoding='utf-8', errors='replace') as f:
    for line in f:
        key_ts, file, offset, length, *_ = line.rstrip('\n').split('\t')
        keys.append(key_ts.split(' ')[0])
        rows.append((file, int(offset), int(length)))

total = 0
for system, prefixes in PREFIXES.items():
    for prefix in prefixes:
        start = max(0, bisect.bisect_left(keys, prefix) - 1)
        end = bisect.bisect_left(keys, prefix + '￿')
        for i in range(start, end):
            file, offset, length = rows[i]
            print(json.dumps({'system': system, 'prefix': prefix, 'file': file, 'offset': offset, 'length': length}))
            total += length
print(f'total bytes {total}', file=sys.stderr)
