# Output Architecture

## Obiettivo

L'output layer trasforma il canonical light state in comandi destinati a simulatori, bridge software o hardware reale.

Il cervello musicale non deve conoscere:

* porte seriali;
* dispositivi USB;
* indirizzi DMX;
* protocolli QLC;
* socket OSC;
* timing del bus;
* dettagli specifici delle fixture.

Queste responsabilità appartengono all'output layer.

## Flusso principale

```text
musical analysis
-> brain decision
-> canonical light state
-> fixture profile
-> DMX frame or bridge command
-> physical output
```

## Canonical light state

Ogni luce deve arrivare all'output come stato canonico normalizzato.

Lo stato deve distinguere almeno:

* fixtureId;
* enabled;
* colorMode;
* resolvedColor;
* intensity;
* effectiveIntensity;
* phaseMode;
* timingIntent;
* strobe;
* fade;
* blackout;
* sceneId;
* cueId;
* timestamp o beat position.

L'output non deve dedurre autonomamente la semantica mancante.

Un impulso visibile in playback deve essere rappresentato da `phaseMode` e `timingIntent` coerenti.

## Output supportati

### Debug output

Serve per:

* timeline JSON;
* logging;
* test automatici;
* replay deterministico;
* diagnosi.

### Browser simulator

Serve per mostrare le luci nella webapp.

Il browser simulator non deve essere la fonte dello stato. Deve essere un consumer del canonical light state.

### QLC Bridge

Invia comandi a QLC+ attraverso il protocollo configurato.

Possibili trasporti:

* OSC;
* MIDI;
* Art-Net;
* sACN;
* altro adapter esplicito.

QLC+ resta utile per:

* compatibilità con interfacce esistenti;
* fixture definitions;
* patch;
* fallback;
* diagnosi;
* supporto temporaneo a hardware non ancora gestito direttamente.

### Direct DMX output

Permette a un adapter locale di comunicare direttamente con un dispositivo supportato.

Il direct output deve essere implementato dispositivo per dispositivo. Non deve tentare di supportare genericamente ogni cavo USB-DMX.

Il target iniziale è:

```text
FT232R USB UART
Serial number: BG03EQH8
```

Prima di inviare DMX, l'adapter deve stabilire quale protocollo usa realmente il dispositivo.

Non si deve assumere che una porta seriale FTDI sia automaticamente compatibile con Open DMX.

## Output manager

Deve esistere un solo proprietario dell'output attivo.

L'OutputManager è responsabile di:

* selezione adapter;
* apertura e chiusura;
* stato della connessione;
* invio frame;
* rate limiting;
* error handling;
* cleanup;
* fallback;
* prevenzione di doppie istanze;
* safe blackout.

Stati minimi:

```text
stopped
starting
running
stopping
error
```

Le operazioni start e stop devono essere idempotenti.

## Fixture mapping

Il fixture mapping traduce lo stato semantico nei canali fisici.

Esempio:

```text
canonical light state
-> fixture profile
-> dimmer / red / green / blue / white / strobe / mode
-> DMX channel values
```

Il mapping deve provenire dal Setup Light salvato e selezionato.

Non devono esistere mapping separati e divergenti tra:

* webapp;
* DMX Dashboard;
* QLC Bridge;
* direct output.

## Timing

Il sistema deve distinguere:

* frequenza di analisi;
* frequenza delle decisioni;
* frequenza del rendering;
* frequenza dell'output DMX.

Il numero di eventi musicali non deve provocare automaticamente lo stesso numero di cambi fisici.

L'output deve rispettare il fixture capacity / expressivity budget.

Con poche fixture, gli eventi devono essere aggregati e resi coerenti. Con più fixture possono essere distribuiti tra gruppi separati.

## Sicurezza

Quando l'output viene fermato, perde la connessione o incontra un errore, il sistema deve entrare in uno stato definito.

Lo stato sicuro predefinito deve essere configurabile tra:

* mantenimento ultimo frame per un tempo limitato;
* fade out;
* blackout.

Non devono rimanere timer, socket, porte seriali o processi proprietari dopo stop, quit o errore.

## Principio architetturale

Il brain decide cosa deve fare la luce.

Il canonical state descrive quella decisione.

Il fixture mapping la traduce nel linguaggio della fixture.

L'output adapter decide come trasmetterla.

Nessuno di questi livelli deve sostituirsi agli altri.
