# Bridge Software Targets

## Perche' ci serve un bridge software

Il nostro cervello musicale non deve sapere subito come parlare con ogni cavo
USB-DMX. Deve produrre eventi luci e mandarli a un software ponte che conosce
fixture, patch, universi e hardware.

## Criteri di scelta

Valutiamo ogni programma su due assi separati:

1. Compatibilita' hardware: quanti cavi/interfacce USB-DMX, Art-Net o sACN
   supporta.
2. Pilotabilita': quanto e' facile controllarlo da fuori con OSC, MIDI, Art-Net,
   timecode o altri meccanismi.

Un programma puo' essere ottimo con hardware economico ma scomodo da pilotare,
o viceversa.

## Candidati

### QLC+

Ruolo consigliato: primo target cross-platform.

Pro:

- open source
- macOS, Windows, Linux
- supporta molte interfacce FTDI/Open DMX/Pro/DMXKing
- supporta input/output e universi multipli
- ha MIDI, OSC, Art-Net e sACN come strade realistiche di integrazione

Contro:

- UI tecnica
- alcune configurazioni economiche possono richiedere tuning
- meno orientato al workflow DJ rispetto a software commerciali

Uso nel nostro progetto:

- target principale per MVP
- primo adapter: OSC o MIDI per trigger scene
- poi Art-Net/sACN se vogliamo lavorare piu' vicino ai canali

### FreeStyler DMX

Ruolo consigliato: target interessante soprattutto per Windows e cavi economici.

Pro:

- molto usato in ambito hobby/DJ
- supporta numerose interfacce USB-DMX economiche
- supporta Art-Net
- supporta MIDI/controller

Contro:

- Windows-centric
- meno moderno
- integrazione esterna da verificare con test pratici
- non e' la base migliore per Mac-first development

Uso nel nostro progetto:

- secondo target da testare quando passiamo al PC Windows
- probabilmente via MIDI o Art-Net
- utile per capire se cavi economici non supportati bene da QLC+ funzionano
  meglio li'

### ChamSys MagicQ

Ruolo consigliato: riferimento semi-pro/pro, non primo target economico.

Pro:

- molto potente
- Art-Net/sACN solidi
- workflow professionale

Contro:

- alcune funzioni/input possono essere limitate senza hardware/licenze ChamSys
- meno adatto come ponte economico universale
- complessita' alta

Uso nel nostro progetto:

- target futuro per validare compatibilita' pro
- meglio via Art-Net/sACN o MIDI/timecode dove consentito

### Lightkey

Ruolo consigliato: target Mac interessante per UI moderna.

Pro:

- interfaccia piu' moderna
- buono per show piccoli/medi
- supporta trigger esterni e hardware comuni

Contro:

- Mac-only
- commerciale
- meno aperto di QLC+

Uso nel nostro progetto:

- possibile confronto UX
- non primo target per MVP open/economico

## Scelta attuale

La scelta per ora e':

1. QLC+ come bridge principale.
2. FreeStyler come bridge Windows/economico da testare.
3. Art-Net/MIDI/OSC come adapter, non come vincolo unico.

## Strategia adapter

Il cervello deve produrre sempre lo stesso formato interno:

```json
{
  "time": 64.0,
  "scene": "techno_peak_white_drive",
  "intent": "peak_energy"
}
```

Poi un adapter decide come inviarlo:

- `qlcplus_osc`
- `qlcplus_midi`
- `qlcplus_artnet`
- `freestyler_midi`
- `freestyler_artnet`
- `magicq_artnet`

In questo modo possiamo cambiare software ponte senza rifare il cervello.
