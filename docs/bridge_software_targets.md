# Bridge Software Targets

## Ruolo dei bridge

Un bridge software collega l'output semantico o DMX del progetto a un software o dispositivo esterno.

Il bridge non deve contenere logica musicale.

Deve limitarsi a:

* ricevere stato o frame;
* tradurlo nel protocollo previsto;
* controllare la connessione;
* riportare stato ed errori;
* chiudere correttamente le risorse.

## QLC+

QLC+ è il bridge software principale supportato nella beta 0.1, ma non deve essere considerato una dipendenza permanente dell'intero prodotto.

Ruoli di QLC+:

* fallback per output DMX;
* verifica hardware;
* supporto a plugin e dispositivi già compatibili;
* patch e fixture definition durante lo sviluppo;
* diagnosi del cavo e delle luci;
* percorso alternativo quando il direct adapter non è disponibile.

## QLC Bridge locale

Il progetto deve possedere un QLC Bridge controllabile dal launcher.

Funzioni minime:

* Start;
* Stop;
* Restart controllato;
* Status;
* Health check;
* visualizzazione dell'errore;
* configurazione host, porta e protocollo;
* prevenzione doppia istanza;
* cleanup alla chiusura;
* riconnessione controllata.

Il bridge non deve partire due volte se l'utente preme ripetutamente Start.

Non deve restare un processo orfano dopo quit o crash gestito.

## Modalità di avvio

Il launcher deve permettere almeno:

* avvio manuale del QLC Bridge;
* arresto manuale;
* avvio automatico opzionale con Start System;
* uso del sistema senza QLC Bridge quando è selezionato un direct adapter o il solo simulatore.

L'avvio automatico non deve essere nascosto o obbligatorio.

## Stato mostrato nel launcher

Stati minimi:

```text
Stopped
Starting
Running
Connected
Disconnected
Error
```

È necessario distinguere:

* processo bridge avviato;
* QLC+ raggiungibile;
* dispositivo DMX disponibile;
* output effettivamente operativo.

`Running` non significa automaticamente che le luci siano raggiungibili.

## Configurazione

La configurazione deve includere:

* output mode;
* protocollo;
* host;
* porta;
* universe, se applicabile;
* setup fixture attivo;
* dispositivo selezionato;
* eventuale frequenza output;
* comportamento in caso di errore.

Universe e output frequency sono configurabili e non devono essere fissati rigidamente.

## Target hardware beta 0.1

Il dispositivo prioritario è:

```text
FT232R USB UART
Serial number: BG03EQH8
```

Il launcher deve mostrare separatamente:

* rilevato dal sistema operativo;
* disponibile;
* occupato;
* riconosciuto da QLC+;
* compatibile con direct adapter;
* non supportato;
* errore.

## Direct adapter e QLC fallback

La selezione dell'output deve seguire questa logica:

```text
Direct adapter disponibile e configurato
-> usa direct output

Direct adapter non disponibile, ma QLC+ è disponibile
-> usa QLC Bridge

Nessuno dei due disponibile
-> blocca output reale e mostra errore
```

Il fallback non deve avvenire silenziosamente. Il launcher deve indicare chiaramente quale percorso è attivo.

## Altri bridge

Altri target possono essere aggiunti in futuro tramite adapter:

* FreeStyler;
* Art-Net node;
* sACN node;
* DMXKing;
* Enttec;
* altri software o dispositivi.

Non devono essere inseriti nel core come casi speciali.

## Principio

Il bridge è un mezzo di trasporto, non il cervello e non la fonte dello stato delle luci.
