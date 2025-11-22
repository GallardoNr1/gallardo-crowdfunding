import './style.css';

const Spinner = () => {
  return (
    <div className='spinner-container'>
      <div className='outer-circle'></div>
      <span className='inner-emoji'>⏳</span>
    </div>
  );
};

export default Spinner;
