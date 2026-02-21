
## Completed

Reverted `groupItemsIntoRows` in the edge function to simple left-to-right joining (no column-gap detection). Added client-side saken cleanup in `formatTabular.ts` to strip embedded `(säkerhetssal)`, `(extern lokal)`, and court name fragments (`CityName tingsrätt`) that leak from the room/location column when PDF columns are merged into single lines.
