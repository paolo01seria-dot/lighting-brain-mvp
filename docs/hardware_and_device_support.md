# Hardware and Device Support

## Stato

Il supporto hardware è già parte della beta 0.1.

Il progetto non supporta genericamente ogni interfaccia DMX. Usa adapter espliciti e verificabili.

## Target beta 0.1

FT232R USB UART  
Serial number: BG03EQH8

Il supporto comprende:

- device discovery;
- capability probe;
- exclusive ownership;
- protocol detection;
- direct output quando tecnicamente valido;
- QLC+ fallback;
- connection state;
- error reporting;
- cleanup;
- safe stop.

## Regola fondamentale

FT232R identifica il chip USB-seriale, non garantisce da solo il protocollo DMX.

Prima di implementare l'output diretto bisogna determinare se il cavo usa:

- Open DMX / bit-bang;
- protocollo seriale proprietario;
- microcontrollore intermedio;
- altro comportamento.

Non inviare dati assumendo un protocollo non verificato.

## Setup salvati

Ogni setup deve contenere:

- setup id;
- nome;
- fixture count;
- fixture ids;
- start addresses;
- channel count;
- channel roles;
- universe;
- output profile;
- device binding opzionale;
- versione schema.

Il launcher deve permettere di selezionare il setup attivo.

## Mappatura reale attualmente nota

La configurazione sperimentale delle sei luci deve essere salvata come setup versionato, non codificata direttamente nell'output manager.

## Espansione futura

Gli adapter successivi possono includere:

- Enttec;
- DMXKing;
- Art-Net;
- sACN;
- altre interfacce USB-DMX;
- hardware proprietario.

Ogni adapter deve dichiarare:

- identificazione;
- capabilities;
- protocollo;
- limiti;
- stato;
- test supportati.