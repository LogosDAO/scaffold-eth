import React from "react";
import "./Modal.css";

function Modal({ setOpenModal }) {
  return (
    <div className="modalBackground">
      <div className="modalContainer">
        <div className="title-modal">
          <h1>Title Here</h1>
        </div>
        <div className="body-modal">
          <p> Lorem Lipsum </p>
        </div>
        <div className="footer-modal">
          <button
            onClick={() => {
              setOpenModal(false);
            }}
          >
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
