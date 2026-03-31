import pytest
from app import app, db, User
import json


@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()


def test_signup(client):
    response = client.post('/signup', data={
        'name': 'Test User',
        'email': 'test@example.com',
        'password': 'password123',
        'phone': '1234567890',
        'csrf_token': 'dummy'  # In real test, generate properly
    })
    assert response.status_code == 302  # Redirect to dashboard


def test_login(client):
    # First signup
    client.post('/signup', data={
        'name': 'Test User',
        'email': 'test@example.com',
        'password': 'password123',
        'phone': '1234567890',
        'csrf_token': 'dummy'
    })
    # Then login
    response = client.post('/login', data={
        'email': 'test@example.com',
        'password': 'password123',
        'csrf_token': 'dummy'
    })
    assert response.status_code == 302


def test_predict_unauthenticated(client):
    response = client.post('/predict', json={'test': 'data'})
    assert response.status_code == 401


def test_predict_authenticated(client):
    # Signup and login
    client.post('/signup', data={
        'name': 'Test User',
        'email': 'test@example.com',
        'password': 'password123',
        'phone': '1234567890',
        'csrf_token': 'dummy'
    })
    client.post('/login', data={
        'email': 'test@example.com',
        'password': 'password123',
        'csrf_token': 'dummy'
    })
    # Now predict
    response = client.post('/predict', json={
        'start_latitude': 26.9124,
        'start_longitude': 75.7873,
        'end_latitude': 26.9150,
        'end_longitude': 75.7930,
        'road_type': 1,
        'speed_limit': 60,
        'blackspot_flag': 0,
        'road_surface': 0,
        'season': 1,
        'time_of_day': 2,
        'weather_type': 0,
        'traffic_density': 1
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'risk' in data