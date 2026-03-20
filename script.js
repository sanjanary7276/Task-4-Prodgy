class SudokuSolver {
    constructor() {
        this.grid = Array(9).fill().map(() => Array(9).fill(0));
        this.originalGrid = Array(9).fill().map(() => Array(9).fill(0));
        this.isVisualizing = false;
        this.isSolving = false;
        this.solveStartTime = 0;
        this.stepCount = 0;
        this.animationSpeed = 50;
        this.initializeUI();
        this.loadSamplePuzzles();
    }

    initializeUI() {
        this.createGrid();
        this.attachEventListeners();
        this.initializeTheme();
    }

    createGrid() {
        const gridContainer = document.getElementById('sudokuGrid');
        gridContainer.innerHTML = '';

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('input');
                cell.type = 'text';
                cell.className = 'sudoku-cell';
                cell.maxLength = 1;
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener('input', (e) => this.handleCellInput(e));
                cell.addEventListener('keydown', (e) => this.handleCellKeydown(e));
                cell.addEventListener('focus', (e) => this.handleCellFocus(e));
                
                gridContainer.appendChild(cell);
            }
        }
    }

    attachEventListeners() {
        document.getElementById('solveBtn').addEventListener('click', () => this.solve());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearGrid());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGrid());
        document.getElementById('importBtn').addEventListener('click', () => this.importPuzzle());
        document.getElementById('loadSampleBtn').addEventListener('click', () => this.loadSamplePuzzle());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        document.getElementById('visualizeMode').addEventListener('change', (e) => {
            this.isVisualizing = e.target.checked;
        });
        
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.animationSpeed = 101 - parseInt(e.target.value);
        });
    }

    handleCellInput(event) {
        const cell = event.target;
        const value = cell.value;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (value && !/^[1-9]$/.test(value)) {
            cell.value = '';
            this.showNotification('Please enter numbers 1-9 only', 'error');
            return;
        }

        this.grid[row][col] = value ? parseInt(value) : 0;
        this.validateCell(cell, row, col);
    }

    handleCellKeydown(event) {
        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        switch(event.key) {
            case 'ArrowUp':
                event.preventDefault();
                this.focusCell(row - 1, col);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.focusCell(row + 1, col);
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.focusCell(row, col - 1);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.focusCell(row, col + 1);
                break;
            case 'Delete':
            case 'Backspace':
                event.preventDefault();
                cell.value = '';
                this.grid[row][col] = 0;
                cell.classList.remove('invalid');
                break;
        }
    }

    handleCellFocus(event) {
        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.highlightRelatedCells(row, col);
    }

    focusCell(row, col) {
        if (row < 0 || row >= 9 || col < 0 || col >= 9) return;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) cell.focus();
    }

    highlightRelatedCells(row, col) {
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.style.background = '';
        });

        const currentCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (currentCell) {
            currentCell.style.background = 'var(--cell-solving)';
        }

        for (let i = 0; i < 9; i++) {
            const rowCell = document.querySelector(`[data-row="${row}"][data-col="${i}"]`);
            const colCell = document.querySelector(`[data-row="${i}"][data-col="${col}"]`);
            if (rowCell && rowCell !== currentCell) rowCell.style.background = 'var(--bg-tertiary)';
            if (colCell && colCell !== currentCell) colCell.style.background = 'var(--bg-tertiary)';
        }

        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                const boxCell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                if (boxCell && boxCell !== currentCell) {
                    boxCell.style.background = 'var(--bg-tertiary)';
                }
            }
        }
    }

    validateCell(cell, row, col) {
        const value = this.grid[row][col];
        if (value === 0) {
            cell.classList.remove('invalid');
            return true;
        }

        const isValid = this.isValidMove(row, col, value);
        cell.classList.toggle('invalid', !isValid);
        
        return isValid;
    }

    isValidMove(row, col, num) {
        for (let x = 0; x < 9; x++) {
            if (this.grid[row][x] === num && x !== col) return false;
            if (this.grid[x][col] === num && x !== row) return false;
        }

        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.grid[boxRow + i][boxCol + j] === num && 
                    (boxRow + i !== row || boxCol + j !== col)) {
                    return false;
                }
            }
        }

        return true;
    }

    async solve() {
        if (this.isSolving) return;

        if (!this.validateGrid()) {
            this.showNotification('Invalid puzzle: Please fix highlighted cells', 'error');
            return;
        }

        this.isSolving = true;
        this.solveStartTime = Date.now();
        this.stepCount = 0;
        this.updateStatus('Solving...');
        this.setButtonsState(true);

        this.copyGrid(this.grid, this.originalGrid);
        this.markOriginalCells();

        const solved = await this.solveWithBacktracking();

        if (solved) {
            this.updateStatus('Solved!');
            this.showNotification('Puzzle solved successfully!', 'success');
            this.highlightSolvedCells();
        } else {
            this.updateStatus('No solution');
            this.showNotification('No solution exists for this puzzle', 'error');
        }

        const solveTime = ((Date.now() - this.solveStartTime) / 1000).toFixed(3);
        document.getElementById('solveTime').textContent = `${solveTime}s`;

        this.isSolving = false;
        this.setButtonsState(false);
    }

    async solveWithBacktracking() {
        const emptyCell = this.findEmptyCell();
        if (!emptyCell) return true;

        const [row, col] = emptyCell;
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        for (let num = 1; num <= 9; num++) {
            if (this.isValidMove(row, col, num)) {
                this.grid[row][col] = num;
                cell.value = num;
                cell.classList.add('solving');
                this.stepCount++;
                document.getElementById('steps').textContent = this.stepCount;

                if (this.isVisualizing) {
                    await this.sleep(this.animationSpeed);
                }

                if (await this.solveWithBacktracking()) {
                    cell.classList.remove('solving');
                    cell.classList.add('solved');
                    return true;
                }

                this.grid[row][col] = 0;
                cell.value = '';
                cell.classList.remove('solving');
            }
        }

        return false;
    }

    findEmptyCell() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    validateGrid() {
        let isValid = true;
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const value = this.grid[row][col];
            
            if (value !== 0) {
                const tempGrid = Array(9).fill().map(() => Array(9).fill(0));
                this.copyGrid(this.grid, tempGrid);
                tempGrid[row][col] = 0;
                
                const valid = this.isValidMoveInGrid(tempGrid, row, col, value);
                cell.classList.toggle('invalid', !valid);
                if (!valid) isValid = false;
            }
        });
        return isValid;
    }

    isValidMoveInGrid(grid, row, col, num) {
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
            if (grid[x][col] === num) return false;
        }

        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[boxRow + i][boxCol + j] === num) return false;
            }
        }

        return true;
    }

    markOriginalCells() {
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            if (this.originalGrid[row][col] !== 0) {
                cell.classList.add('original');
            }
        });
    }

    highlightSolvedCells() {
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            if (this.originalGrid[row][col] === 0 && this.grid[row][col] !== 0) {
                cell.classList.add('solved');
            }
        });
    }

    clearGrid() {
        this.grid = Array(9).fill().map(() => Array(9).fill(0));
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.value = '';
            cell.classList.remove('invalid', 'solving', 'solved', 'original');
        });
        this.updateStatus('Ready');
        document.getElementById('solveTime').textContent = '--';
        document.getElementById('steps').textContent = '0';
    }

    resetGrid() {
        this.copyGrid(this.originalGrid, this.grid);
        this.updateGridDisplay();
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.classList.remove('invalid', 'solving', 'solved');
        });
        this.updateStatus('Ready');
        document.getElementById('solveTime').textContent = '--';
        document.getElementById('steps').textContent = '0';
    }

    updateGridDisplay() {
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            cell.value = this.grid[row][col] !== 0 ? this.grid[row][col] : '';
        });
    }

    copyGrid(source, destination) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                destination[i][j] = source[i][j];
            }
        }
    }

    importPuzzle() {
        const input = document.getElementById('puzzleInput').value.trim();
        if (!input) {
            this.showNotification('Please enter a puzzle', 'warning');
            return;
        }

        const lines = input.split('\n').filter(line => line.trim());
        if (lines.length !== 9) {
            this.showNotification('Puzzle must have exactly 9 lines', 'error');
            return;
        }

        const newGrid = Array(9).fill().map(() => Array(9).fill(0));
        
        for (let row = 0; row < 9; row++) {
            const chars = lines[row].replace(/\s/g, '').split('');
            if (chars.length !== 9) {
                this.showNotification(`Line ${row + 1} must have exactly 9 characters`, 'error');
                return;
            }

            for (let col = 0; col < 9; col++) {
                const char = chars[col];
                if (char === '0' || char === '.') {
                    newGrid[row][col] = 0;
                } else if (/^[1-9]$/.test(char)) {
                    newGrid[row][col] = parseInt(char);
                } else {
                    this.showNotification(`Invalid character '${char}' at row ${row + 1}, col ${col + 1}`, 'error');
                    return;
                }
            }
        }

        this.copyGrid(newGrid, this.grid);
        this.updateGridDisplay();
        document.getElementById('puzzleInput').value = '';
        this.showNotification('Puzzle imported successfully', 'success');
        this.updateStatus('Ready');
    }

    loadSamplePuzzles() {
        this.samplePuzzles = {
            easy: [
                "530070000",
                "600195000",
                "098000060",
                "800060003",
                "400803001",
                "700020006",
                "060000280",
                "000419005",
                "000080079"
            ],
            medium: [
                "040001000",
                "000700050",
                "100000060",
                "002060400",
                "000000000",
                "004020900",
                "030000007",
                "080003000",
                "000600040"
            ],
            hard: [
                "000000000",
                "000003085",
                "001020000",
                "000507000",
                "004000100",
                "090000000",
                "500000073",
                "002010000",
                "000040009"
            ],
            expert: [
                "800000000",
                "003600000",
                "070090200",
                "050007000",
                "000045700",
                "000100030",
                "001000068",
                "008500010",
                "090000400"
            ]
        };
    }

    loadSamplePuzzle() {
        const difficulty = document.getElementById('difficultySelect').value;
        if (!difficulty) {
            this.showNotification('Please select a difficulty level', 'warning');
            return;
        }

        const puzzle = this.samplePuzzles[difficulty];
        const newGrid = Array(9).fill().map(() => Array(9).fill(0));

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                newGrid[row][col] = puzzle[row][col] === '0' ? 0 : parseInt(puzzle[row][col]);
            }
        }

        this.copyGrid(newGrid, this.grid);
        this.updateGridDisplay();
        this.showNotification(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} puzzle loaded`, 'success');
        this.updateStatus('Ready');
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('sudoku-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sudoku-theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    updateStatus(status) {
        document.getElementById('status').textContent = status;
    }

    setButtonsState(disabled) {
        document.getElementById('solveBtn').disabled = disabled;
        document.getElementById('clearBtn').disabled = disabled;
        document.getElementById('resetBtn').disabled = disabled;
        document.getElementById('importBtn').disabled = disabled;
        document.getElementById('loadSampleBtn').disabled = disabled;
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SudokuSolver();
});
