def render_adapter_events(timeline, adapter):
  if adapter == "debug":
    return render_debug_events(timeline)
  if adapter == "qlcplus_osc":
    return render_qlcplus_osc_events(timeline)
  if adapter == "qlcplus_midi":
    return render_qlcplus_midi_events(timeline)
  if adapter == "freestyler_midi":
    return render_freestyler_midi_events(timeline)
  if adapter == "artnet_intent":
    return render_artnet_intent_events(timeline)

  raise ValueError(f"Unsupported adapter: {adapter}")


def render_debug_events(timeline):
  return {
    "adapter": "debug",
    "events": [
      {
        "time": event["time"],
        "message": (
          f"{event['scene']} ({event['intent']}, "
          f"{event.get('sample_category', 'unknown')} x{event.get('category_repeat_count', 1)})"
        )
      }
      for event in timeline["events"]
    ]
  }


def render_qlcplus_osc_events(timeline):
  return {
    "adapter": "qlcplus_osc",
    "note": "OSC addresses are placeholders until we map a real QLC+ workspace.",
    "events": [
      {
        "time": event["time"],
        "address": "/lighting/scene",
        "args": [
          event["scene"],
          event["intent"],
          event.get("sample_category", "unknown"),
          int(event.get("scene_changed", False)),
        ]
      }
      for event in timeline["events"]
    ]
  }


def render_qlcplus_midi_events(timeline):
  return {
    "adapter": "qlcplus_midi",
    "note": "MIDI notes are deterministic placeholders for mapping tests.",
    "events": [
      {
        "time": event["time"],
        "type": "note_on",
        "channel": 1,
        "note": scene_to_midi_note(event["scene"]),
        "velocity": 127 if event.get("scene_changed") else 96
      }
      for event in timeline["events"]
    ]
  }


def render_freestyler_midi_events(timeline):
  midi = render_qlcplus_midi_events(timeline)
  midi["adapter"] = "freestyler_midi"
  midi["note"] = "Same placeholder MIDI mapping, intended for Windows tests."
  return midi


def render_artnet_intent_events(timeline):
  return {
    "adapter": "artnet_intent",
    "note": "Not raw Art-Net DMX yet; this previews a future low-level adapter.",
    "events": [
      {
        "time": event["time"],
        "universe": 0,
        "intent": event["intent"],
        "scene": event["scene"],
        "sample_category": event.get("sample_category"),
        "rhythmic_actions": event.get("rhythmic_actions", [])
      }
      for event in timeline["events"]
    ]
  }


def scene_to_midi_note(scene):
  return 36 + (sum(scene.encode("utf-8")) % 48)
