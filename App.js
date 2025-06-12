import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 15;
const BLOCK_WIDTH = 60;
const BLOCK_HEIGHT = 20;
const BLOCKS_PER_ROW = 5;
const BLOCK_ROWS = 4;

export default function App() {
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [blocks, setBlocks] = useState([]);
  
  const ballX = useSharedValue(screenWidth / 2);
  const ballY = useSharedValue(screenHeight - 200);
  const ballVelocityX = useSharedValue(3);
  const ballVelocityY = useSharedValue(-3);
  const paddleX = useSharedValue(screenWidth / 2 - PADDLE_WIDTH / 2);
  
  const gameLoopRef = useRef();

  const initializeBlocks = () => {
    const newBlocks = [];
    for (let row = 0; row < BLOCK_ROWS; row++) {
      for (let col = 0; col < BLOCKS_PER_ROW; col++) {
        newBlocks.push({
          id: row * BLOCKS_PER_ROW + col,
          x: col * (BLOCK_WIDTH + 5) + 20,
          y: row * (BLOCK_HEIGHT + 5) + 100,
          destroyed: false,
          color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'][row]
        });
      }
    }
    setBlocks(newBlocks);
  };

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    ballX.value = screenWidth / 2;
    ballY.value = screenHeight - 200;
    ballVelocityX.value = 3;
    ballVelocityY.value = -3;
    paddleX.value = screenWidth / 2 - PADDLE_WIDTH / 2;
    initializeBlocks();
    startGameLoop();
  };

  const checkBlockCollision = () => {
    setBlocks(currentBlocks => {
      let newBlocks = [...currentBlocks];
      let hitBlock = false;
      
      for (let i = 0; i < newBlocks.length; i++) {
        const block = newBlocks[i];
        if (!block.destroyed) {
          if (ballX.value + BALL_SIZE >= block.x && 
              ballX.value <= block.x + BLOCK_WIDTH &&
              ballY.value + BALL_SIZE >= block.y && 
              ballY.value <= block.y + BLOCK_HEIGHT) {
            newBlocks[i] = { ...block, destroyed: true };
            hitBlock = true;
            setScore(prev => prev + 10);
            break;
          }
        }
      }
      
      if (hitBlock) {
        ballVelocityY.value = -ballVelocityY.value;
      }
      
      return newBlocks;
    });
  };

  const startGameLoop = () => {
    const gameLoop = () => {
      ballX.value += ballVelocityX.value;
      ballY.value += ballVelocityY.value;
      
      // 壁との当たり判定
      if (ballX.value <= 0 || ballX.value >= screenWidth - BALL_SIZE) {
        ballVelocityX.value = -ballVelocityX.value;
      }
      if (ballY.value <= 0) {
        ballVelocityY.value = -ballVelocityY.value;
      }
      
      // ゲームオーバー判定
      if (ballY.value >= screenHeight - 50) {
        runOnJS(setGameOver)(true);
        runOnJS(setGameStarted)(false);
        return;
      }
      
      // パドルとの当たり判定
      const paddleY = screenHeight - 100;
      if (ballY.value + BALL_SIZE >= paddleY && 
          ballY.value <= paddleY + PADDLE_HEIGHT &&
          ballX.value + BALL_SIZE >= paddleX.value && 
          ballX.value <= paddleX.value + PADDLE_WIDTH) {
        ballVelocityY.value = -Math.abs(ballVelocityY.value);
      }
      
      // ブロックとの当たり判定
      runOnJS(checkBlockCollision)();
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  const onPanGesture = (event) => {
    paddleX.value = Math.max(0, Math.min(screenWidth - PADDLE_WIDTH, event.nativeEvent.absoluteX - PADDLE_WIDTH / 2));
  };

  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ballX.value }, { translateY: ballY.value }],
  }));

  const paddleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: paddleX.value }],
  }));

  // ゲーム完了チェック
  useEffect(() => {
    const remainingBlocks = blocks.filter(block => !block.destroyed);
    if (remainingBlocks.length === 0 && blocks.length > 0 && gameStarted) {
      setGameOver(true);
      setGameStarted(false);
    }
  }, [blocks, gameStarted]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.title}>ブロック崩し</Text>
      <Text style={styles.score}>スコア: {score}</Text>
      
      {!gameStarted && !gameOver && (
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.buttonText}>ゲーム開始</Text>
        </TouchableOpacity>
      )}
      
      {gameOver && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>ゲームオーバー</Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>もう一度</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {gameStarted && (
        <View style={styles.gameArea}>
          {/* ブロック */}
          {blocks.map(block => (
            !block.destroyed && (
              <View 
                key={block.id}
                style={[
                  styles.block,
                  {
                    left: block.x,
                    top: block.y,
                    backgroundColor: block.color
                  }
                ]}
              />
            )
          ))}
          
          {/* ボール */}
          <Animated.View style={[styles.ball, ballStyle]} />
          
          {/* パドル */}
          <PanGestureHandler onGestureEvent={onPanGesture}>
            <Animated.View style={[styles.paddle, paddleStyle]} />
          </PanGestureHandler>
        </View>
      )}
      
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  score: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 50,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameOverContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  gameOverText: {
    fontSize: 24,
    color: '#ff6b6b',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    backgroundColor: '#fff',
    borderRadius: BALL_SIZE / 2,
  },
  paddle: {
    position: 'absolute',
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    backgroundColor: '#4ecdc4',
    borderRadius: 5,
    bottom: 100,
  },
  block: {
    position: 'absolute',
    width: BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    borderRadius: 5,
  },
});