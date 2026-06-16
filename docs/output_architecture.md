# Output Architecture

## Domanda chiave

Il nostro output deve essere DMX diretto o comandi integrabili con software luci
come QLC+?

## Decisione consigliata

Per l'MVP l'output non deve essere DMX diretto.

Deve essere una timeline/event stream astratta, convertibile in:

- OSC verso QLC+
- MIDI verso QLC+ o altri software
- Art-Net/sACN in una fase successiva
- DMX diretto solo quando avremo davvero bisogno di bypassare i software luci

## Perche' non DMX diretto subito

DMX diretto significa assumersi subito:

- patch fixture
- canali DMX
- personality fixture
- dimmer, pan, tilt, colore, gobos, shutter, strobo
- compatibilita' interfacce USB-DMX
- gestione universe
- sicurezza dei valori inviati alle luci

Questa parte e' enorme e QLC+ la fa gia'.

## Perche' QLC+ come primo target

QLC+ e' open source e supporta protocolli adatti a integrazioni esterne:

- OSC
- MIDI
- Art-Net
- sACN/E1.31
- DMX USB tramite plugin

Questo ci permette di fare il cervello musicale e lasciare a QLC+ il lavoro
sporco della gestione luci.

## Architettura proposta

```text
Rekordbox / file / live audio
-> player adapter
-> music analysis
-> genre profile
-> lighting intent timeline
-> output adapter
-> QLC+ scene/function trigger
-> DMX hardware
```

## Formato interno

Il nostro formato interno deve descrivere intenzioni, non canali DMX:

```json
{
  "time": 64.0,
  "intent": "peak_energy",
  "scene": "techno_peak_white_drive",
  "target": "qlcplus",
  "transport": "osc"
}
```

Poi un adapter traduce questo in comandi specifici.

## Due idee a confronto

### Idea A: cervello che controlla QLC+

Pro:

- piu' veloce da prototipare
- meno codice hardware
- usa QLC+ per fixture, patch e output DMX
- facile da testare senza luci fisiche
- resta compatibile con altri software via adapter

Contro:

- dipende da una configurazione QLC+
- dobbiamo mappare bene scene/funzioni QLC+

Verdetto: strada migliore per MVP e prime feste.

### Idea B: integrare parti di QLC+ e creare un'app completa

Pro:

- controllo totale dell'esperienza
- interfaccia unica
- potenziale prodotto piu' autonomo

Contro:

- QLC+ e' grande e complesso
- bisogna valutare bene licenza, architettura e linguaggio
- molto piu' lento arrivare a un risultato usabile
- rischiamo di ricostruire fixture editor, patching e output prima ancora di
  validare il cervello musicale

Verdetto: interessante piu' avanti, non come primo passo.

## Roadmap output

1. JSON timeline interna.
2. Export leggibile per debug.
3. OSC adapter verso QLC+.
4. MIDI adapter.
5. Art-Net/sACN adapter solo se serve output piu' diretto.
6. Valutazione integrazione codice QLC+ dopo aver validato il prodotto.

## Confine DMX interno preparatorio

Il progetto ora puo' preparare un output DMX diretto senza togliere QLC+.
Il confine pulito e':

```text
canonical light state / web scene
-> fixture scene {fixture_id: rgb/intensity}
-> OutputDriver
-> 512-channel DMX universe
-> transport reale o mock
```

La sorgente di verita' futura per la fixture map e' Setup Light. Il payload
salvato dalla webapp contiene gia' una forma compatibile (`fixtures` e
`qlcFixtures`), quindi Mock, QLC+ e il futuro FTDI devono consumare la stessa
mappa caricata da Setup Light invece di duplicare configurazioni.

Il mapping reale testato sui 6 fari vive solo come preset:

- `SIX_LIGHT_TEST_PRESET`
- `factory_default_fixture_map()`

Questo preset serve per test, demo, primo avvio e fallback. Non deve essere
interpretato come configurazione finale hardcoded.

Driver previsti:

- `QlcOutputDriver`: fallback attuale, delega al bridge QLC+.
- `MockDmxDriver`: universo interno a 512 canali per test/debug.
- `InternalFtdiDmxDriver`: futuro driver hardware FTDI USB-DMX.

Il primo pezzo implementato e' volutamente solo mock:

- `DmxUniverse.set_channel(channel, value)`
- `DmxUniverse.get_channel(channel)`
- `DmxUniverse.snapshot()`
- `DmxUniverse.get_changed_channels(previous_snapshot)`
- `MockDmxDriver.set_fixture_color(fixture_id, r, g, b, intensity)`
- `MockDmxDriver.set_fixture_blackout(fixture_id)`
- `MockDmxDriver.set_fixture_strobe(fixture_id, value)`
- `MockDmxDriver.apply_simple_light_state(fixture_id, state)`
- `MockDmxDriver.set_scene({fixtures: ...})`
- `MockDmxDriver.blackout()`
- `MockDmxDriver.serialize()`
- `MockDmxDriver.active_channel_table()`

La mappa fixture supporta gia':

- RGB 3CH: `r`, `g`, `b`
- RGB 6CH: `dimmer`, `r`, `g`, `b`, `strobe`, `mode`
- Dual RGBW 12CH: `dimmer`, `r/g/b/white`, `r2/g2/b2/white2`, `strobe`, `mode`, `speed`

Caricamento previsto:

- `load_fixture_map("configs/fixture_map.json")` per un file salvato in futuro.
- `setup_light_payload_to_fixture_map(payload)` per usare direttamente il formato
  prodotto da Setup Light.
- fallback al preset solo quando non c'e' ancora una mappa utente.

Regole di sicurezza del layer DMX:

- valori sempre clampati a `0..255`;
- canali validati in `1..512`;
- `strobe`, `mode`, `speed` restano a `0` in colore RGB normale;
- i canali white restano a `0` finche' non aggiungiamo una logica white esplicita;
- QLC+ rimane disponibile come output fallback.

Test manuale sicuro, senza hardware:

```bash
python3 scripts/dmx_mock_test.py
```

Questo comando crea un universo mock, accende alcuni fixture mappati, stampa i
canali DMX attivi e poi fa blackout. Non apre porte USB e non invia DMX reale.

## Software ponte alternativi

QLC+ e' il primo target, ma non l'unico. FreeStyler puo' essere interessante su
Windows per la compatibilita' con molte interfacce USB-DMX economiche. La scelta
del software ponte deve restare configurabile tramite adapter.

Vedi `bridge_software_targets.md`.
