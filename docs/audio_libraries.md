# Audio Libraries

Queste librerie hanno ruoli diversi nel progetto. Non vanno installate tutte
subito se stiamo ancora costruendo il formato dati e la logica scene.

## librosa

Ruolo: analisi audio offline.

Utile per:

- loudness/energia nel tempo
- onset detection
- chroma e tonalita'
- spectral centroid/brightness
- separare parti calme, build-up e drop con euristiche semplici

Quando usarla:

- subito dopo `all-in-one`
- su file audio gia' disponibili
- per arricchire il JSON con features che aiutano a scegliere scene migliori

Nota: `all-in-one` usa gia' `librosa`, quindi e' coerente con il repo di base.

## aubio

Ruolo: analisi audio realtime o quasi realtime, piu' leggera.

Utile per:

- beat/onset detection live
- pitch detection
- tracking immediato mentre passa audio

Quando usarla:

- dopo il primo MVP offline
- quando vogliamo reagire a un ingresso audio live
- se QLC+ o un altro sistema deve ricevere eventi mentre la musica suona

Nota macOS: `aubio==0.4.9` puo' fallire in build su Apple Silicon/Python 3.11
con NumPy recente. Per questo non e' incluso nell'extra `audio` base: lo
terremo come extra separato e lo affronteremo quando lavoreremo davvero sul
realtime a bassa latenza.

## sounddevice

Ruolo: input/output audio dal computer.

Utile per:

- ascoltare microfono o ingresso audio
- catturare blocchi audio in tempo reale
- costruire un prototipo live senza passare da file preanalizzati

Quando usarla:

- non nel primo MVP
- quando passiamo da "analizzo un file" a "ascolto cio' che sta suonando"

## Ordine consigliato

1. MVP offline con JSON di `all-in-one`.
2. Aggiungere `librosa` per calcolare energia e cambi dinamici.
3. Generare timeline luci piu' ricche.
4. Solo dopo: `sounddevice` + `aubio` per realtime.

## Stato implementazione

Primo modulo aggiunto:

```text
audio file
-> lighting_brain.audio_analysis.analyze_audio_file()
-> analysis JSON compatibile con lighting-brain
-> timeline / output adapter
```

Il comando dedicato e':

```shell
uv pip install ".[audio]"
lighting-audio-analyze tracks/brano.mp3 --out analysis/brano.librosa.json
```

Nota installazione: per l'extra `audio` usiamo installazione non-editable
(`uv pip install ".[audio]"`). L'editable install (`-e`) puo' creare problemi
con il path locale se la cartella contiene spazi.

`librosa` e' usato per BPM, beat, onset, RMS, centroid e prima segmentazione.
`sounddevice` e' incluso nell'extra `audio` per prepararci agli input live.
`aubio` resta separato per evitare blocchi di installazione: il primo motore
reale usa `librosa` e funziona offline sui file.

## Principio

Prima facciamo show luci sensati su una traccia gia' analizzata. Poi li rendiamo
live. Il realtime e' piu' difficile da debuggare, quindi arriva dopo.
