curl -X POST "https://elasticsearch.aonprd.com/aon/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "term": { "name": "treerazer" } }, 
          { "term": { "type": "creature" } }
        ]
      }
    },
    "_source": ["name", "url", "id", "type"],
    "size": 3
  }'