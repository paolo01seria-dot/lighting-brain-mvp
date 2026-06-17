# Project Direction

## Obiettivo del prodotto

Lighting Brain è un sistema locale plug-and-play che analizza l'audio riprodotto dal computer, interpreta struttura musicale, BPM, beat, componenti e categorie musicali, genera uno spettacolo luci coerente e lo invia a un impianto DMX reale.

Il valore del prodotto non è soltanto generare una timeline astratta. Il prodotto deve coprire l'intera catena:

```text
system audio
-> audio capture
-> musical analysis
-> lighting brain
-> canonical light state
-> fixture mapping
-> output manager
-> QLC bridge oppure output hardware diretto
-> USB-DMX / Art-Net / sACN
-> luci reali
```

## Stato attuale

Il progetto ha già superato la fase iniziale basata esclusivamente su file audio e timeline JSON.

Le aree attive sono:

* cattura audio di sistema;
* analisi audio live;
* generazione scene;
* review e training;
* canonical light state;
* Setup Light;
* configurazione fixture e canali;
* output QLC/DMX;
* launcher locale;
* gestione dei processi necessari al sistema.

I file audio offline e le timeline JSON restano strumenti utili per debug, test e analisi preventiva, ma non rappresentano più da soli il prodotto.

## Sorgenti audio

La sorgente primaria del prodotto è l'audio di sistema generato da Rekordbox, Spotify, Apple Music o altre applicazioni.

Su macOS la cattura deve usare un percorso interno affidabile, per esempio:

* CoreAudio Process Tap, quando disponibile;
* device loopback come BlackHole;
* adapter equivalente.

Il microfono è solo fallback o strumento di debug. Non deve essere presentato come equivalente all'audio di sistema.

## Lighting brain

Il cervello deve trasformare gli eventi musicali in decisioni luminose semantiche.

Deve distinguere almeno:

* impulso;
* sustain;
* fade;
* blackout;
* strobo;
* cambi di colore;
* cambi di gruppo;
* cambi di scena;
* variazioni a first half, second half o full beat.

Le decisioni devono essere normalizzate nel canonical light state prima del rendering visuale o dell'output fisico.

## Output reale

QLC+ è supportato come bridge e fallback, ma non è più considerato l'unica destinazione possibile.

L'architettura deve supportare due percorsi:

```text
Lighting Brain -> QLC Bridge -> QLC+ -> hardware DMX
```

e:

```text
Lighting Brain -> Direct Output Adapter -> hardware DMX
```

Il supporto diretto non significa duplicare l'intero software QLC+. Significa implementare adapter mirati per i dispositivi realmente supportati.

## Target hardware immediato

Per la beta 0.1 il target hardware prioritario è:

```text
FT232R USB UART
Serial number: BG03EQH8
```

Il progetto deve:

* rilevare il dispositivo;
* verificarne la disponibilità;
* determinare il protocollo supportato;
* impedire aperture concorrenti;
* gestire connessione, disconnessione ed errori;
* inviare output sicuro;
* usare QLC+ come fallback quando necessario.

Il supporto del target FTDI non è una funzione futura.

## Setup Light

Setup Light è una modalità separata dal Training.

Deve permettere di:

* definire il numero di fixture;
* configurare il numero di canali;
* individuare il canale iniziale;
* assegnare ruoli come red, green, blue, white, dimmer, strobe e mode;
* verificare fisicamente ogni canale;
* salvare il setup;
* selezionare il setup attivo dal launcher;
* usare la stessa configurazione nel rendering, nella DMX Dashboard e nell'output reale.

## Training

Il Training deve permettere all'utente di correggere le decisioni del cervello e salvare esempi riutilizzabili.

Lo sviluppo futuro comprende:

* scene pool;
* sample-category;
* scene-category;
* scene freshness;
* copy/paste selettivo;
* fixture group;
* varianti;
* apprendimento da correzioni;
* sequenze più lunghe e coerenti.

## Analisi musicale futura

La direzione dell'analisi comprende:

* BPM e beat confidence;
* beat e downbeat;
* struttura musicale;
* segment boundaries;
* segment labels;
* drum, bass, vocal e melody;
* energia relativa;
* attivazioni temporali ad alta risoluzione;
* integrazione All-In-One/Music Dissector o adapter equivalenti.

Lo spettrogramma visuale non deve diventare una sorgente decisionale implicita. Le informazioni musicali devono arrivare al cervello tramite dati normalizzati e affidabili.

## Principio generale

Il progetto deve restare modulare:

```text
audio adapters
analysis adapters
brain
canonical state
fixture mapping
output adapters
launcher/process manager
```

Nessun layer deve incorporare responsabilità appartenenti agli altri layer.
