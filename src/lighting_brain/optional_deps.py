from importlib import import_module


class OptionalDependencyError(RuntimeError):
  pass


def require_module(name, install_hint="uv pip install -e '.[audio]'"):
  try:
    return import_module(name)
  except ImportError as error:
    raise OptionalDependencyError(
      f"Optional dependency '{name}' is required. Install it with: {install_hint}"
    ) from error
