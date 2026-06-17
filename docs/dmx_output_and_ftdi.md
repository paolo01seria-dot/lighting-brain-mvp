# DMX Output and FTDI Target

## Target

FT232R USB UART  
Serial number: BG03EQH8

## Immediate objective

Determine and implement the safest valid output path for this exact device.

## Required investigation

- identify how QLC+ detects and controls it;
- locate the relevant QLC+ plugin/source path;
- identify protocol and timing;
- determine whether direct access is technically valid;
- document driver requirements;
- document macOS device path behavior;
- verify exclusive access;
- verify disconnect and reconnect.

## Capability result

The probe must report one of:

- direct_output_supported;
- qlc_only;
- device_busy;
- driver_missing;
- unsupported_protocol;
- disconnected;
- error.

## No assumption rule

FT232R alone does not prove Open DMX compatibility.

No direct output implementation may be enabled before protocol confirmation.

## Tests

- device absent;
- device present;
- device busy;
- second application launch;
- repeated connect/disconnect;
- repeated Start/Stop;
- cable removal during output;
- QLC fallback;
- process quit;
- safe blackout.