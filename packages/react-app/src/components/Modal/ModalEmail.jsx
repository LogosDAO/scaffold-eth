import React from "react";
import "./Modal.css";

function ModalEmail({ setOpenModal, emailAddress }) {
  return (
    <div className="modalBackground">
      <div className="modalContainer">
       
        <div className="title-modal">
          <h1>Thank You</h1>
        </div>
        <div className="body-modal">
          <p>We have added your email {emailAddress} to our mailing list.</p>
        </div>
        <div className="footer-modal">
        <button onClick={() => {
              setOpenModal(false);
            }}>← Go back</button>

        </div>
      </div>
    </div>
  );
}

export default ModalEmail;
