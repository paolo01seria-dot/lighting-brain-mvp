# Lighting Brain MVP

Base leggera per trasformare un'analisi musicale in una timeline luci.

Obiettivo iniziale:

```text
audio file
-> all-in-one analysis JSON
-> scene mapping rules
-> lighting timeline JSON
```

Per ora non controlliamo hardware DMX. Generiamo una scaletta di eventi luci
che poi potra' essere inviata a QLC+, OSC, MIDI, Art-Net o un altro sistema.

## Cartelle

- `tracks/`: brani audio di test, non committati.
- `analysis/`: JSON prodotti da `all-in-one`.
- `scene_maps/`: regole che associano sezioni musicali a scene luci.
- `scripts/`: script del nostro MVP.
- `output/`: timeline generate.
- `docs/`: appunti e decisioni di progetto.

## Prova rapida senza installare nulla

```shell
python3 scripts/build_lighting_timeline.py \
  analysis/example_allin1_result.json \
  --scene-map scene_maps/basic_house_party.json \
  --adapter debug \
  --out output/example_timeline.json
```

## Setup con uv

```shell
uv venv --python 3.11
source .venv/bin/activate
uv pip install -e .
```

Da quel momento puoi usare il comando:

```shell
lighting-brain \
  analysis/example_allin1_result.json \
  --scene-map scene_maps/basic_house_party.json \
  --adapter debug \
  --out output/example_timeline.json
```

Il risultato sara' un JSON con eventi del tipo:

```json
{
  "time": 38.0,
  "scene": "chorus_energy_red",
  "reason": "segment: chorus"
}
```

## Prossimo passo reale

Quando abbiamo una canzone `.mp3` o `.wav`, la analizziamo con `all-in-one` e
mettiamo il JSON in `analysis/`. Questo MVP puo' gia' convertirlo in una bozza
di show luci.

## Librerie audio

La strategia e' documentata in `docs/audio_libraries.md`.

- `librosa`: prima integrazione utile, per analisi offline piu' ricca.
- `aubio`: utile piu' avanti per beat/onset realtime.
- `sounddevice`: utile quando vorremo leggere audio live dal Mac.

Le dipendenze opzionali sono in `requirements-optional.txt`, ma non servono per
la prova rapida.

Quando vuoi provare la prima analisi audio reale:

```shell
uv pip install ".[audio]"
lighting-audio-analyze \
  "tracks/brano-test.mp3" \
  --out analysis/brano-test.librosa.json
```

Quel JSON puo' poi entrare nel comando `lighting-brain` come gli altri file di
analisi.

## Direzione prodotto

- Player adapter: vedi `docs/player_integrations.md`.
- Output luci: vedi `docs/output_architecture.md`.
- Software ponte: vedi `docs/bridge_software_targets.md`.
- Hardware futuro: vedi `docs/hardware_future.md`.
- Regole architetturali: vedi `docs/architecture_rules.md`.
- Metadati training/annotazione: vedi `docs/training_metadata.md`.
- Profili genere: vedi `scene_maps/genre_profiles.json`.
- Prima priorita' musicale dopo il metal: house e techno.

## Mini interfaccia tester

```shell
python3 -m http.server 8787
```

Poi apri:

```text
http://localhost:8787/web/
```

La UI carica un audio locale e pilota un tester luci 5x5 simulato nel browser.
La direzione corretta del tester e' descritta in `docs/visual_tester_direction.md`.

## Prova con profilo genere

```shell
python3 scripts/build_lighting_timeline.py \
  analysis/example_allin1_result.json \
  --scene-map scene_maps/basic_house_party.json \
  --genre-profiles scene_maps/genre_profiles.json \
  --genre techno \
  --adapter qlcplus_osc \
  --out output/example_techno_qlcplus_osc.json
```

Il file generato contiene sia la timeline interna sia una preview dell'output
per l'adapter selezionato.
