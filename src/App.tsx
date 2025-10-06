import { Box, Button, Container, IconButton, styled, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

// 로컬스토리지 관련 유틸리티 함수들
const STORAGE_KEY = "scoreboard-game-data";

interface StoredGameData {
  gameSetting: GameSetting;
  players: Player[];
  gameStart: boolean;
}

const saveToLocalStorage = (data: StoredGameData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("로컬스토리지 저장 실패:", error);
  }
};

const loadFromLocalStorage = (): StoredGameData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("로컬스토리지 불러오기 실패:", error);
    return null;
  }
};

const clearLocalStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("로컬스토리지 삭제 실패:", error);
  }
};

export interface GameSetting {
  playerList: { name: string }[];
  gameNums: number;
}

export interface Player {
  name: string;
  score: number[];
  total: number;
}

function App() {
  const { control, watch, setFocus, getValues, reset } = useForm<GameSetting>({
    defaultValues: {
      gameNums: 10,
      playerList: [{ name: "" }],
    },
  });

  const [gameStart, setGameStart] = useState<boolean>(false);
  const [players, setPlayers] = useState<Player[]>([]);

  // 페이지 로드 시 저장된 데이터 불러오기
  useEffect(() => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      reset(savedData.gameSetting);
      setPlayers(savedData.players);
      setGameStart(savedData.gameStart);
    }
  }, [reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "playerList",
  });

  // 플레이어 추가
  const handleClickAppendPlayer = (index: number) => {
    append({ name: "" });
    setTimeout(() => {
      setFocus(`playerList.${index + 1}.name`);
    }, 1);
  };

  // 게임 시작
  const handleClickStartGame = () => {
    setGameStart(true);
    const { playerList, gameNums } = getValues();
    const newPlayers = playerList.map((player) => ({ name: player.name, score: Array(gameNums).fill(undefined), total: 0, currentGame: 1 }));
    setPlayers(newPlayers);

    // 로컬스토리지에 게임 데이터 저장
    saveToLocalStorage({
      gameSetting: { playerList, gameNums },
      players: newPlayers,
      gameStart: true,
    });
  };

  // 재시작
  const handleClickResetGame = () => {
    if (window.confirm("재시작하겠습니까?")) {
      clearLocalStorage();
      setGameStart(false);
    }
  };

  // 점수 입력
  const handleBlurInput = (playerIndex: number, gameIndex: number, newScore: string) => {
    setPlayers((prev) => {
      const updatedPlayers = prev.map((player, pIndex) => {
        if (pIndex === playerIndex) {
          const newScoreValue = Number(newScore) || 0;
          const updatedScore = player.score.map((score, gIndex) => (gIndex === gameIndex ? newScoreValue : score));
          const newTotal = updatedScore.reduce((sum, score) => sum + (score || 0), 0);

          return {
            name: player.name,
            score: updatedScore,
            total: newTotal,
          };
        }
        return player;
      });

      // 로컬스토리지에 업데이트된 플레이어 데이터 저장
      if (gameStart) {
        const { playerList, gameNums } = getValues();
        saveToLocalStorage({
          gameSetting: { playerList, gameNums },
          players: updatedPlayers,
          gameStart: true,
        });
      }

      return updatedPlayers;
    });
  };

  return (
    <SBContainer maxWidth="sm">
      {gameStart ? (
        <ScoreBox>
          <Typography variant="h4">점수판</Typography>
          <ScoreTable>
            {players
              .slice()
              .sort((a, b) => a.total - b.total)
              .map((player, i) => (
                <ScoreTableBox key={`합계-${player.name}`}>
                  <span>{i + 1}.</span>
                  <ScoreTableBoxSpan>{player.name}</ScoreTableBoxSpan>
                  <ScoreTableBoxSpan>{player.total}</ScoreTableBoxSpan>
                  {i !== 0 && <ScoreTableBoxScoreSpan>(+{(players.slice().sort((a, b) => a.total - b.total)[0].total - player.total) * -1})</ScoreTableBoxScoreSpan>}
                </ScoreTableBox>
              ))}
          </ScoreTable>
          <SBTableContainer className="list">
            <Table>
              <TableHead>
                <TableRow>
                  <SBTableCell></SBTableCell>
                  {players.map((player) => (
                    <SBTableCell key={player.name} sx={{ backgroundColor: "#BDBDBD" }}>
                      {player.name}
                    </SBTableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: getValues("gameNums") }).map((_, i) => (
                  <SBTableRow key={`$-${i}`}>
                    <SBTableCell>{i + 1}</SBTableCell>
                    {players.map((_, j) => (
                      <SBTableCell key={`${i}-${j}`} sx={{ backgroundColor: players[j].score[i] === 0 ? "#FFF176" : players[j].score[i] === -50 ? "#f06292" : "none" }}>
                        <ScoreTextField value={players[j].score[i] ?? ""} onChange={(e) => handleBlurInput(j, i, e.target.value)} />
                      </SBTableCell>
                    ))}
                  </SBTableRow>
                ))}
              </TableBody>
            </Table>
          </SBTableContainer>
          <Button variant="contained" onClick={handleClickResetGame}>
            재시작
          </Button>
        </ScoreBox>
      ) : (
        <form>
          <StartBox>
            <FormBox>
              <p>게임 수</p>
              <Controller name="gameNums" control={control} render={({ field: { value, onChange } }) => <SBTextField size="small" value={value} onChange={onChange} />} />
            </FormBox>
            <FormBox>
              <p>플레이어</p>
              <PlayerBox>
                {fields.map((field, index) => (
                  <PlayerInputBox key={field.id}>
                    <Controller
                      name={`playerList.${index}.name`}
                      control={control}
                      render={({ field: { value, onChange, ref } }) => <SBTextField inputRef={ref} size="small" value={value} onChange={onChange} />}
                    />
                    {index !== 0 && (
                      <IconButton onClick={() => remove(index)}>
                        <RemoveIcon />
                      </IconButton>
                    )}
                    {index === watch("playerList").length - 1 && (
                      <IconButton size="small" onClick={() => handleClickAppendPlayer(index)}>
                        <AddIcon />
                      </IconButton>
                    )}
                  </PlayerInputBox>
                ))}
              </PlayerBox>
            </FormBox>
            <Button variant="contained" onClick={handleClickStartGame}>
              게임 시작
            </Button>
          </StartBox>
        </form>
      )}
    </SBContainer>
  );
}

export default App;

const SBContainer = styled(Container)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
});

const SBTableContainer = styled(TableContainer)({
  border: "1px solid #616161",
  borderRadius: 8,
});

const SBTableRow = styled(TableRow)({
  "&:last-child td, &:last-child th": {
    borderBottom: 0,
  },
});

const SBTableCell = styled(TableCell)({
  textAlign: "center",
  borderRight: "1px solid #616161",
  borderBottomColor: "#616161",
  padding: 8,
  "&:last-child": {
    borderRight: 0,
  },
});

const StartBox = styled(Box)({
  width: "100wh",
  height: "50vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
});

const SBTextField = styled(TextField)({
  width: 140,

  textAlign: "center",
  backgroundColor: "transparent",
});

const FormBox = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr 3fr",
  alignItems: "center",
  gap: 8,
  width: "100%",
});

const PlayerInputBox = styled(Box)({
  display: "flex",
  alignItems: "center",
});

const PlayerBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

const ScoreTextField = styled("input")({
  width: 40,
  // padding: "10px 20px",
  borderWidth: 0,
  textAlign: "center",
  ":focus": {
    outline: "none",
  },
  backgroundColor: "transparent",
});

const ScoreTable = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

const ScoreTableBox = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr 2fr 2fr 2fr",
  gap: 8,
});

const ScoreBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
});

const ScoreTableBoxSpan = styled("span")({
  textAlign: "center",
  fontWeight: 700,
});

const ScoreTableBoxScoreSpan = styled("span")({
  fontWeight: 700,
  color: "#1e88e5",
});
