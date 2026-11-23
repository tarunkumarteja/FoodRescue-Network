#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Ensure venv site-packages are discovered when running through host python
    base_dir = os.path.dirname(os.path.abspath(__file__))
    site_packages = os.path.join(base_dir, 'venv', 'Lib', 'site-packages')
    if os.path.exists(site_packages) and site_packages not in sys.path:
        sys.path.insert(0, site_packages)

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
