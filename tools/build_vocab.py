#!/usr/bin/env python3
"""Compatibilidad: el generador es ahora tools/build_content.py, que cubre
todos los idiomas y también lecturas y listening. Este nombre se conserva para
no romper scripts o hábitos; delega sin más."""
import runpy, sys
sys.argv[0] = "build_content.py"
runpy.run_path(__file__.replace("build_vocab.py", "build_content.py"), run_name="__main__")
