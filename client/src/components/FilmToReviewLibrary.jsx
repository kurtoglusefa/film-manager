import React from 'react';
import { Table, Button, Form } from 'react-bootstrap/';
import { Link, useLocation } from 'react-router-dom';
import Pagination from 'react-js-pagination';

function FilmToReviewTable(props) {
  const handlePageChange = (pageNumber) => {
    props.refreshFilms(pageNumber);
  };

  return (
    <>
      <Table>
        <tbody>
          {props.films.map((film) => (
            <PublicFilmRow
              key={film.id}
              filmData={film}
              deleteFilm={props.deleteFilm}
              updateFilm={props.updateFilm}
              selectFilm={props.selectFilm}          // callback from PageLayout → App.handleSelectFilm
              onlineList={props.onlineList}          // WS: who selected which film (per user)
              user={props.user}                      // logged-in user
              filmSelections={props.filmSelections}  // MQTT: which user has this film active
            />
          ))}
        </tbody>
      </Table>

      <Pagination
        itemClass="page-item"
        linkClass="page-link"
        activePage={parseInt(sessionStorage.getItem('currentPage')) || 1}
        itemsCountPerPage={
          parseInt(sessionStorage.getItem('totalPages'))
            ? parseInt(sessionStorage.getItem('totalItems')) /
            parseInt(sessionStorage.getItem('totalPages'))
            : 0
        }
        totalItemsCount={parseInt(sessionStorage.getItem('totalItems')) || 0}
        pageRangeDisplayed={10}
        onChange={handlePageChange}
        pageSize={parseInt(sessionStorage.getItem('totalPages')) || 0}
      />
    </>
  );
}

function PublicFilmRow(props) {
  const { filmData, onlineList, user, filmSelections } = props;
  const location = useLocation();

  // Which film is currently selected as *active* for THIS logged-in user (WS state)
  let selectedFilmId = -1;
  for (let i = 0; i < onlineList.length; i++) {
    if (Number(onlineList[i].userId) === Number(sessionStorage.getItem('userId'))) {
      selectedFilmId = onlineList[i].filmId;
    }
  }

  // From MQTT: which user (if any) currently has THIS film active
  let activeUserName = '';
  const selection = filmSelections?.find(
    (s) => Number(s.filmId) === Number(filmData.id)
  );
  if (selection && selection.status === 'active' && selection.userName) {
    activeUserName = selection.userName;
  }

  return (
    <tr>
      {/* Edit / delete icons (only for owner) */}
      <td>
        {Number(filmData.owner) === Number(sessionStorage.getItem('userId')) && (
          <>
            <Link
              to={`/public/edit/${filmData.id}`}
              state={[{ film: filmData }, { nextpage: location.pathname }]}
            >
              <i className="bi bi-pencil-square" />
            </Link>
            &nbsp; &nbsp;
            <Link to={{}}>
              <i
                className="bi bi-trash"
                onClick={() => {
                  props.deleteFilm(filmData);
                }}
              />
            </Link>
          </>
        )}
      </td>

      {/* Radio to select this film as active */}
      <td>
        <Form.Check type="radio">
          <Form.Check.Input
            type="radio"
            checked={filmData.id === selectedFilmId}
            onChange={() => props.selectFilm(filmData, user)}
          />
        </Form.Check>
      </td>

      {/* Film title + MQTT "selected by" badge */}
      <td>
        {activeUserName && (
          <span className="badge bg-light text-dark me-2">
            {activeUserName}
          </span>
        )}
        <p
          className={[
            'keep-white-space',
            filmData.favorite ? 'bi-favorite' : '',
          ].join(' ')}
        >
          {filmData.title}
        </p>
      </td>

      {/* Read reviews */}
      <td>
        <Link
          to={`/public/${filmData.id}/reviews`}
          state={[{ film: filmData }, { nextpage: location.pathname }]}
        >
          <Button variant="primary">Read Reviews</Button>{' '}
        </Link>
      </td>

      {/* Issue review (only for owner) */}
      <td>
        {Number(filmData.owner) === Number(sessionStorage.getItem('userId')) && (
          <Link
            to={`/public/${filmData.id}/issue`}
            state={[{ film: filmData }, { nextpage: location.pathname }]}
          >
            <Button variant="secondary">Issue Review</Button>{' '}
          </Link>
        )}
      </td>
    </tr>
  );
}

export default FilmToReviewTable;
