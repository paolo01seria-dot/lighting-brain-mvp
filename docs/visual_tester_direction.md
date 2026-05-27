# Visual Tester Direction

## Correzione concettuale

Il mini tester non deve essere una tabella fixture x colore.

Una luce reale autonoma e' un singolo oggetto che, in un dato istante, assume
un colore/intensita'/movimento. Quindi il tester deve rappresentare luci come
cerchi posizionabili nello stage.

## Stato attuale

La UI in `web/` ora include:

- numero configurabile di luci
- luci come cerchi trascinabili
- menu output
- menu genere
- caricamento audio
- reazione live basata su Web Audio API, ora impostata a eventi impulsivi:
  luci quasi sempre spente, flash/chase su onset e decadimento rapido

Questa reazione browser e' utile solo come preview iniziale.

## Limite del demo browser

Per ottenere una resa simile a uno show luci vero, la UI non deve decidere tutto
da sola usando soltanto energia/frequenze istantanee.

Serve una pipeline piu' musicale:

```text
audio/Rekordbox
-> Python analysis
-> beats, downbeats, sections, energy curve, drops, breaks
-> lighting intent timeline
-> visual tester / QLC+ / FreeStyler
```

## Prossimo obiettivo

Creare un output Python piu' ricco che includa eventi per singola luce:

```json
{
  "time": 32.0,
  "light": 3,
  "color": "blue",
  "intensity": 0.85,
  "movement": "chase",
  "duration": 0.5,
  "reason": "downbeat"
}
```

La UI dovra' poter leggere questi eventi e riprodurli sullo stage, invece di
inventare pattern solo lato browser.

## Pattern da implementare

- chase: accensione progressiva da sinistra a destra o lungo layout custom
- sweep: cambio colore che attraversa lo stage
- hit: flash breve su accenti forti
- blackout: spegnimento breve prima di drop o cambio sezione
- build: aumento progressivo di intensita'
- drop: cambio netto palette/intensita'
- call-response: due gruppi di luci si alternano

## Principio

Il browser e' il visualizzatore. Il cervello deve restare Python.
