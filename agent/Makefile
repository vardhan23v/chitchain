.PHONY: install test lint format clean run

install:
	pip install -r requirements.txt
	pip install pytest flake8 black

test:
	pytest tests/ -v

lint:
	flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

format:
	black .

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +

run:
	python main.py
