import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import type { GameData, GuessResult } from './types/game';
import { GAME_MODES, getModeByPath, type GameModeId } from './types/modes';
import { useModeCompletion } from './hooks/useModeCompletion';
import { GameLayout } from './components/Game/GameLayout';
import { Silhouette } from './components/Silhouette/Silhouette';
import { TurnIndicator } from './components/TurnIndicator/TurnIndicator';
import { SpecsClue } from './components/Clues/SpecsClue';
import { ContextClue } from './components/Clues/ContextClue';
import { TriviaClue } from './components/Clues/TriviaClue';
import { PhotoReveal } from './components/Clues/PhotoReveal';
import { AircraftSearch } from './components/AircraftSearch/AircraftSearch';
import { GuessHistory, type GuessEntry } from './components/GuessHistory/GuessHistory';
import { WinModal } from './components/WinModal/WinModal';
import { HelpModal } from './components/HelpModal/HelpModal';
import { ModeMenu } from './components/ModeMenu/ModeMenu';
import type { AircraftListEntry } from './hooks/useAircraftSearch';
import './styles/animations.css';
import './App.css';

function App() {
  // Get current mode from URL path
  const location = useLocation();
  const navigate = useNavigate();
  const currentMode = getModeByPath(location.pathname);
  const modeConfig = GAME_MODES[currentMode];

  // Mode completion tracking
  const { isComplete: isModeComplete, result: savedResult, markComplete, allCompletions } = useModeCompletion(currentMode);

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive demo state
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [guessedIds, setGuessedIds] = useState<string[]>([]);
  const [guessResults, setGuessResults] = useState<GuessResult[]>([]);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Win reveal state - reveals clues sequentially on win
  const [winRevealStep, setWinRevealStep] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);

  // Timer state
  const startTimeRef = useRef<number | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);

  // Track if we've saved completion for this game session
  const completionSavedRef = useRef(false);

  // Window dimensions for confetti
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Current turn is 1 + number of guesses made
  const currentTurn = guessResults.length + 1;
  const totalTurns = 5;

  // Reset game state when mode changes
  useEffect(() => {
    setGameData(null);
    setLoading(true);
    setError(null);
    setGuesses([]);
    setGuessedIds([]);
    setGuessResults([]);
    setIsGameComplete(false);
    setIsWin(false);
    setShowConfetti(false);
    setShowWinModal(false);
    setWinRevealStep(0);
    setIsRevealing(false);
    startTimeRef.current = null;
    setTimeTaken(0);
    completionSavedRef.current = false;
  }, [currentMode]);

  // Start timer when game data loads
  useEffect(() => {
    if (gameData && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
  }, [gameData]);

  // Update window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load game data for current mode
  useEffect(() => {
    async function loadGameData() {
      try {
        // Try API first, fallback to static file
        let response = await fetch(`/api/game/today?mode=${currentMode}`);

        // If API fails, try static file
        if (!response.ok) {
          response = await fetch(modeConfig.dataFile);
        }

        if (!response.ok) {
          throw new Error(`Failed to load game data: ${response.status}`);
        }
        const data: GameData = await response.json();
        setGameData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadGameData();
  }, [currentMode, modeConfig.dataFile]);

  // Save completion to localStorage when game ends
  useEffect(() => {
    if (isGameComplete && !completionSavedRef.current && !isModeComplete && gameData) {
      completionSavedRef.current = true;
      markComplete({
        isWin,
        guessCount: guessResults.length,
        timeTaken,
        guessResults,
        aircraftId: gameData.aircraft.id,
      });
    }
  }, [isGameComplete, isWin, guessResults, timeTaken, markComplete, isModeComplete, gameData]);

  // Restore completed state from localStorage if same aircraft was already played
  useEffect(() => {
    if (gameData && isModeComplete && savedResult && savedResult.aircraftId === gameData.aircraft.id) {
      // Same aircraft - restore completion state
      setIsGameComplete(true);
      setIsWin(savedResult.isWin);
      setGuessResults(savedResult.guessResults);
      setTimeTaken(savedResult.timeTaken);
      completionSavedRef.current = true; // Don't re-save

      // Reconstruct guess history for display
      const reconstructedGuesses: GuessEntry[] = savedResult.guessResults.map((r, i) => ({
        shipName: r === 'correct'
          ? (gameData.aircraft.typeName || gameData.aircraft.name)
          : `Guess ${i + 1}`,
        correct: r === 'correct',
      }));
      setGuesses(reconstructedGuesses);
    }
    // If aircraftId doesn't match (new game generated), state stays fresh
  }, [gameData, isModeComplete, savedResult]);

  // Sequential reveal effect on win
  useEffect(() => {
    if (!isRevealing) return;

    const maxSteps = 4; // specs, context, trivia, photo (0-3 indexes)
    if (winRevealStep >= maxSteps) {
      setIsRevealing(false);
      // Wait 1 second after all clues are revealed, then show modal
      const modalTimer = setTimeout(() => {
        setShowWinModal(true);
      }, 1000);
      return () => clearTimeout(modalTimer);
    }

    const timer = setTimeout(() => {
      setWinRevealStep((prev) => prev + 1);
    }, 600); // 600ms between each reveal

    return () => clearTimeout(timer);
  }, [isRevealing, winRevealStep]);

  const handleAircraftSelect = useCallback(
    (aircraft: AircraftListEntry) => {
      if (!gameData || isGameComplete) return;

      // Check if the guess is correct - match by type name, aircraft name, or aliases
      const selectedName = aircraft.name.toLowerCase();
      const isCorrect =
        // Match by type name (primary match for type-based guessing)
        selectedName === gameData.aircraft.typeName?.toLowerCase() ||
        // Match by aircraft name (also accepted)
        selectedName === gameData.aircraft.name.toLowerCase() ||
        // Match by aliases
        gameData.aircraft.aliases.some(
          (alias) => alias.toLowerCase() === selectedName
        );

      // Add to guess history
      const newGuess: GuessEntry = {
        shipName: aircraft.name,
        correct: isCorrect,
      };
      setGuesses((prev) => [...prev, newGuess]);
      setGuessedIds((prev) => [...prev, aircraft.id]);

      // Add to guess results
      const result: GuessResult = isCorrect ? 'correct' : 'wrong';
      setGuessResults((prev) => [...prev, result]);

      // Check for game end
      if (isCorrect) {
        // Calculate time taken
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setTimeTaken(elapsed);
        }

        setIsWin(true);
        setIsGameComplete(true);
        setShowConfetti(true);
        setIsRevealing(true);
        setWinRevealStep(0);
        console.log('Correct! You identified:', gameData.aircraft.name);
      } else if (guessResults.length + 1 >= totalTurns) {
        setIsGameComplete(true);
        console.log('Game over! The aircraft was:', gameData.aircraft.name);
      } else {
        console.log('Wrong guess:', aircraft.name, '- Try again!');
      }
    },
    [gameData, isGameComplete, guessResults.length]
  );

  // Calculate which clues to reveal (normal game flow or win reveal)
  const getClueRevealed = (clueIndex: number): boolean => {
    // After win, keep all clues revealed
    if (isWin && !isRevealing) {
      return true;
    }
    if (isWin && isRevealing) {
      // During win reveal, show clues based on winRevealStep
      return winRevealStep >= clueIndex;
    }
    // Normal gameplay - reveal based on current turn
    return currentTurn >= clueIndex + 1;
  };

  // Handle mode selection from menu
  const handleModeSelect = useCallback(
    (mode: GameModeId) => {
      navigate(GAME_MODES[mode].path);
    },
    [navigate]
  );

  if (loading) {
    return (
      <div className="app app--loading">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="app app--error">
        <h1>Tally</h1>
        <p className="error-message">Failed to load game data: {error}</p>
      </div>
    );
  }

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}
      <WinModal
        isOpen={showWinModal}
        className={gameData.aircraft.typeName || gameData.aircraft.aliases[0] || gameData.aircraft.name}
        shipName={gameData.aircraft.name}
        guessCount={guessResults.length}
        totalTurns={totalTurns}
        guessResults={guessResults}
        timeTaken={timeTaken}
        modeName={currentMode === 'main' ? 'Daily' : modeConfig.name}
        onClose={() => setShowWinModal(false)}
      />
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
      <GameLayout
        header={
          <div className="app-header">
            <div className="app-header__left">
              <ModeMenu
                currentMode={currentMode}
                completions={allCompletions}
                onSelectMode={handleModeSelect}
              />
            </div>
            <div className="app-header__center">
              <h1 className="app-title">Tally</h1>
              <p className="app-tagline">{modeConfig.name}</p>
            </div>
            <button
              className="app-header__help-button"
              onClick={() => setShowHelpModal(true)}
              type="button"
              aria-label="How to play"
            >
              ?
            </button>
          </div>
        }
        silhouette={
          <Silhouette
            src={gameData.silhouette}
            alt="Mystery aircraft silhouette"
            photoUrl={gameData.clues.photo}
            aircraftName={gameData.aircraft.name}
            showPhoto={getClueRevealed(4) || currentTurn >= 5}
          />
        }
        turnIndicator={
          <TurnIndicator
            currentTurn={currentTurn}
            totalTurns={totalTurns}
            guessResults={guessResults}
          />
        }
        clues={
          <>
            <SpecsClue
              data={gameData.clues.specs}
              revealed={getClueRevealed(1) || currentTurn >= 2}
            />
            <ContextClue
              data={gameData.clues.context}
              revealed={getClueRevealed(2) || currentTurn >= 3}
            />
            <TriviaClue
              text={gameData.clues.trivia}
              revealed={getClueRevealed(3) || currentTurn >= 4}
            />
            <PhotoReveal
              photoUrl={gameData.clues.photo}
              aircraftName={gameData.aircraft.name}
              revealed={getClueRevealed(4) || currentTurn >= 5}
            />
          </>
        }
        guessHistory={<GuessHistory guesses={guesses} />}
        search={
          isGameComplete ? (
            <div className="game-result">
              <p className="game-result__text">
                {isWin
                  ? `Tally-ho! You identified ${gameData.aircraft.typeName || gameData.aircraft.aliases[0] || gameData.aircraft.name} (${gameData.aircraft.name})!`
                  : `Game over! It was ${gameData.aircraft.typeName || gameData.aircraft.aliases[0] || gameData.aircraft.name} (${gameData.aircraft.name}).`}
              </p>
              {isWin && !showWinModal && (
                <button
                  className="game-result__share-button"
                  onClick={() => setShowWinModal(true)}
                  type="button"
                >
                  Share Result 📋
                </button>
              )}
            </div>
          ) : (
            <AircraftSearch
              onSelect={handleAircraftSelect}
              disabled={isGameComplete}
              excludeIds={guessedIds}
              targetClass={{
                id: gameData.aircraft.id,
                name: gameData.aircraft.typeName || gameData.aircraft.aliases[0] || gameData.aircraft.name
              }}
            />
          )
        }
      />
    </>
  );
}

export default App;
