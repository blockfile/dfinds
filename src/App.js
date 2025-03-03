import "./App.css";
import Main from "./components/pages/main/main";
import Header from "../src/components/header/header"; // Import the Header component (adjust path if necessary)

function App() {
  return (
    <div className="App">
      <Header />
      <Main />
    </div>
  );
}

export default App;
