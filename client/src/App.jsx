import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { Container, Toast } from 'react-bootstrap/';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import {
  PrivateLayout,
  PublicLayout,
  PublicToReviewLayout,
  ReviewLayout,
  AddPrivateLayout,
  EditPrivateLayout,
  AddPublicLayout,
  EditPublicLayout,
  EditReviewLayout,
  IssueLayout,
  DefaultLayout,
  NotFoundLayout,
  LoginLayout,
  LoadingLayout,
  OnlineLayout
} from './components/PageLayout';
import { Navigation } from './components/Navigation';

import MessageContext from './messageCtx';
import API from './API';


// MQTT
import mqtt from 'mqtt';
// WebSocket URL
const WS_URL = 'ws://localhost:5000';
const mqttHost = 'ws://127.0.0.1:8080';   // Mosquitto WebSocket listener



// MQTT options and client
const mqttOptions = {
  keepalive: 30,
  clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  will: {
    topic: 'WillMsg',
    payload: 'Connection Closed abnormally..!',
    qos: 0,
    retain: false,
  },
  rejectUnauthorized: false,
};
// Create ONE shared client for the whole app
const mqttClient = mqtt.connect(mqttHost, mqttOptions);



function App() {
  const [message, setMessage] = useState('');

  const handleErrors = (err) => {
    let msg = '';
    if (err?.error) msg = err.error;
    else if (typeof err === 'string') msg = String(err);
    else msg = 'Error';
    setMessage(msg);
  };

  return (
    <BrowserRouter>
      <MessageContext.Provider value={{ handleErrors }}>
        <Container fluid className="App">
          <Routes>
            <Route path="/*" element={<Main />} />
          </Routes>
          <Toast
            show={message !== ''}
            onClose={() => setMessage('')}
            delay={4000}
            autohide
          >
            <Toast.Body>{message}</Toast.Body>
          </Toast>
        </Container>
      </MessageContext.Provider>
    </BrowserRouter>
  );
}

function Main() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({});

  const [onlineList, setOnlineList] = useState([]);
  const [filmSelections, setFilmSelections] = useState([]);      // [{filmId, userName, status}]
  const [subscribedTopics, setSubscribedTopics] = useState([]);  // ['2','3',...]
  const [filmManager, setFilmManager] = useState({});

  const { handleErrors } = useContext(MessageContext);
  const location = useLocation();
  const socket = useRef(null);

  // Load Film Manager resource
  useEffect(() => {
    API.getFilmManager()
      .then((fm) => {
        setFilmManager(fm);
        sessionStorage.setItem('filmManager', JSON.stringify(fm));
        console.log('FilmManager:', fm);
      })
      .catch(handleErrors);
  }, []);

  // WebSocket + MQTT wiring
  useEffect(() => {
    console.log('Initializing WebSocket at', new Date().toString());
    const ws = new WebSocket(WS_URL);
    socket.current = ws;

    // --- WebSocket handlers ---
    ws.onopen = () => {
      console.log('WebSocket connected');

      // if user already stored (page refresh), announce login
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        ws.send(
          JSON.stringify({
            typeMessage: 'login',
            userId: u.id,
            userName: u.name,
            filmId: null,
            filmTitle: null,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // if server ever sends initial array of online users
        if (Array.isArray(data)) {
          setOnlineList(data);
          return;
        }

        const msg = data;
        setOnlineList((prev) => {
          const current = [...prev];
          const idx = current.findIndex((m) => m.userId === msg.userId);

          if (msg.typeMessage === 'login') {
            if (idx === -1) current.push(msg);
            else current[idx] = msg;
          } else if (msg.typeMessage === 'update') {
            if (idx === -1) current.push(msg);
            else current[idx] = { ...current[idx], ...msg };
          } else if (msg.typeMessage === 'logout') {
            if (idx !== -1) current.splice(idx, 1);
          }

          return current;
        });
      } catch (err) {
        console.error('WebSocket message error', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    // --- MQTT handlers ---
    const handleMqttMessage = (topic, message) => {
      try {
        const parsed = JSON.parse(message.toString());
        const filmId = Number(topic);

        setFilmSelections((currentArray) => {
          const newArray = [...currentArray];
          const idx = newArray.findIndex((x) => x.filmId === filmId);

          const objectStatus = {
            filmId,
            userName: parsed.userName || null,
            status: parsed.status, // 'active' | 'inactive' | 'deleted'
          };

          if (idx === -1) newArray.push(objectStatus);
          else newArray[idx] = objectStatus;

          return newArray;
        });
      } catch (err) {
        console.error('Bad MQTT message', err);
      }
    };

    mqttClient.on('connect', () => {
      console.log('MQTT connected in React');
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT error in React', err);
    });

    mqttClient.on('message', handleMqttMessage);

    // Cleanup
    return () => {
      ws.close();
      mqttClient.removeListener('message', handleMqttMessage);
    };
  }, []);

  // Initial auth + filters
  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const f = ['private', 'public', 'public/to_review', 'online'];
      setFilters(f);

      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setLoggedIn(true);
      } else {
        setUser(null);
        setLoggedIn(false);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Login
  const handleLogin = async (filmManagerResource, credentials) => {
    try {
      const loggedUser = await API.logIn(filmManagerResource, credentials);
      sessionStorage.setItem('user', JSON.stringify(loggedUser));
      sessionStorage.setItem('userId', loggedUser.id);
      sessionStorage.setItem('username', loggedUser.name);
      sessionStorage.setItem('email', loggedUser.email);

      setUser(loggedUser);
      setLoggedIn(true);

      // notify through WebSocket
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.send(
          JSON.stringify({
            typeMessage: 'login',
            userId: loggedUser.id,
            userName: loggedUser.name,
            filmId: null,
            filmTitle: null,
          })
        );
      }
    } catch (err) {
      throw err;
    }
  };

  // Logout
  const handleLogout = async (filmManagerResource) => {
    const storedUser = sessionStorage.getItem('user');
    let userId = null,
      userName = null;
    if (storedUser) {
      const u = JSON.parse(storedUser);
      userId = u.id;
      userName = u.name;
    }

    await API.logOut(filmManagerResource);

    // notify through WebSocket
    if (socket.current && socket.current.readyState === WebSocket.OPEN && userId) {
      socket.current.send(
        JSON.stringify({
          typeMessage: 'logout',
          userId,
          userName,
        })
      );
    }

    setLoggedIn(false);
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('email');
  };

  // Selection of a film (REST + WS update)
  const handleSelectFilm = async (film, currentUser) => {
    try {
      await API.selectFilm(film, currentUser);

      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        const userId = currentUser.userId ?? currentUser.id;
        const userName = currentUser.userName ?? currentUser.name;

        socket.current.send(
          JSON.stringify({
            typeMessage: 'update',
            userId,
            userName,
            filmId: film.id,
            filmTitle: film.title,
          })
        );
      }
    } catch (err) {
      handleErrors(err);
    }
  };

  const filmManagerFromSession =
    sessionStorage.getItem('filmManager') &&
    JSON.parse(sessionStorage.getItem('filmManager'));

  const userFromSession =
    sessionStorage.getItem('user') &&
    JSON.parse(sessionStorage.getItem('user'));

  return (
    <>
      <Navigation
        logout={handleLogout}
        user={user}
        loggedIn={loggedIn}
        filmManager={filmManagerFromSession}
      />

      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <LoadingLayout />
            ) : loggedIn ? (
              <DefaultLayout filters={filters} onlineList={onlineList} />
            ) : (
              <Navigate to="/login" replace state={location} />
            )
          }
        >
          <Route
            index
            element={<PrivateLayout filmManager={filmManagerFromSession} />}
          />
          <Route
            path="private"
            element={<PrivateLayout filmManager={filmManagerFromSession} />}
          />
          <Route
            path="private/add"
            element={<AddPrivateLayout filmManager={filmManagerFromSession} />}
          />
          <Route path="private/edit/:filmId" element={<EditPrivateLayout />} />

          <Route
            path="public"
            element={<PublicLayout filmManager={filmManagerFromSession} />}
          />
          <Route
            path="public/add"
            element={<AddPublicLayout filmManager={filmManagerFromSession} />}
          />
          <Route path="public/edit/:filmId" element={<EditPublicLayout />} />
          <Route path="public/:filmId/reviews" element={<ReviewLayout />} />
          <Route
            path="public/:filmId/reviews/complete"
            element={<EditReviewLayout />}
          />
          <Route
            path="public/:filmId/issue"
            element={<IssueLayout filmManager={filmManagerFromSession} />}
          />

          <Route
            path="public/to_review"
            element={
              <PublicToReviewLayout
                onlineList={onlineList}
                filmManager={filmManagerFromSession}
                user={userFromSession}
                onSelectFilm={handleSelectFilm}
                filmSelections={filmSelections}
                mqttClient={mqttClient}
                subscribedTopics={subscribedTopics}
                setSubscribedTopics={setSubscribedTopics}
              />
            }
          />

          <Route path="online" element={<OnlineLayout onlineList={onlineList} />} />
          <Route path="*" element={<NotFoundLayout />} />
        </Route>

        <Route
          path="/login"
          element={
            <LoginLayout
              login={handleLogin}
              filmManager={filmManagerFromSession}
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;
