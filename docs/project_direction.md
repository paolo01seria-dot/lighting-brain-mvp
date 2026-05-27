# Project Direction

## Decisione iniziale

Partiamo dal cervello musicale, non dal controllo DMX diretto.

Motivo: DMX, fixture patching e compatibilita' hardware sono gia' gestiti da
software come QLC+. Il valore nuovo sta nel decidere scene sensate partendo da
struttura musicale, energia e cambi di sezione.

## MVP 1

Input:

- JSON prodotto da `all-in-one`
- mappa scene semplice

Output:

- timeline JSON con eventi luci

## MVP 2

Inviare la timeline a un sistema luci esistente:

- prima opzione: QLC+ via OSC
- alternativa: MIDI virtuale
- alternativa futura: Art-Net / sACN

Vedi `output_architecture.md` per la scelta tra output DMX diretto e controllo
di QLC+.

## Player integration

L'app dovra' supportare Rekordbox come primo player DJ, ma la struttura deve
restare modulare. Ogni player deve essere trattato come un adapter che produce
uno stato normalizzato: traccia, posizione, BPM, beatgrid, sezioni disponibili e
stato play/pause.

Vedi `player_integrations.md`.

## Generi musicali

Il progetto non deve restare tarato solo sul metal. I primi profili da costruire
sono:

- metal
- house
- techno
- electronic
- garage

House e techno sono prioritarie perche' coprono gran parte dell'uso DJ e hanno
pattern ritmici piu' prevedibili per un primo lighting brain.

## Hardware

Per ora non serve comprare nulla. Quando la timeline sara' credibile, testeremo
con QLC+ e solo dopo valuteremo interfacce USB-DMX o Art-Net.

Nota importante: il progetto puo' includere piu' avanti hardware sviluppato da
noi, dato che c'e' competenza elettronica nel team. Vedi `hardware_future.md`.
