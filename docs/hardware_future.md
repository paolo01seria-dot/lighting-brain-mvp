# Hardware Future

## Premessa

Il progetto puo' evolvere anche verso hardware proprietario o open hardware,
non solo verso integrazioni software con QLC+.

Dato che nel team c'e' competenza elettronica, l'interfaccia DMX non va vista
come una scatola nera permanente. Per l'MVP usiamo hardware esistente, ma piu'
avanti potremmo progettare una soluzione nostra.

## Possibili direzioni

### USB-DMX interface

Una interfaccia economica ma robusta:

- USB verso microcontrollore o bridge seriale
- uscita RS-485 isolata
- connettore XLR 3-pin e/o 5-pin
- protezioni ESD/transient
- alimentazione pulita
- timing DMX gestito in firmware
- compatibilita' con protocolli gia' supportati da software comuni, quando
  possibile

### Art-Net / sACN node

Una soluzione piu' scalabile:

- Ethernet o Wi-Fi, preferibilmente Ethernet per uso live
- uno o piu' universi DMX
- supporto Art-Net e/o sACN/E1.31
- configurazione via web UI
- isolamento e protezioni lato DMX

### Lighting Brain hardware appliance

Fase piu' avanzata:

- input audio
- rete
- output DMX/Art-Net
- modalita' standalone
- sincronizzazione con app desktop

## Perche' non ora

Prima dobbiamo validare:

- qualita' analisi musicale
- scene detection per generi diversi
- integrazione con Rekordbox/player
- workflow con QLC+
- utilita' reale durante una festa o set DJ

Se queste parti funzionano, allora progettare hardware dedicato ha molto piu'
senso e puo' diventare un vantaggio competitivo.

## Principio

MVP software prima. Hardware serio dopo. Ma il progetto deve restare disegnato
in modo da poter accogliere una nostra interfaccia DMX o Art-Net senza rifare
tutto.
