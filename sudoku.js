'use strict';

var myApp = angular.module('sudokuApp',[]);

myApp.controller('SudokuController', ['$scope', '$log', function($scope, $log) {
  
  /*
   * Init
   *
   */
  
  var N = 9;

  /*
   * Grid
   *
   */
   
  function Grid(data) {
    this.grid = this.buildGrid(data);
    
    this.buildTransposedGrid();
    this.buildSubgrids();
  }
  
  Grid.prototype.buildGrid = function(data) {
    var grid = [];
    
    for(var i = 0; i < N; i++) {
      grid[i] = [];
      
      for(var j = 0; j < N; j++) {
        var cell = new Cell(i, j, data[i][j]);
        grid[i][j] = cell;
      }
    }
    
    $log.debug('built grid', grid);
  
    return grid;
  }
  
  Grid.prototype.getRow = function(cell) {
    return this.grid[cell.rowIndex];
  }
  
  Grid.prototype.buildTransposedGrid = function() {
    this.tGrid = [];
    
    for(var j = 0; j < N; j++) {
      this.tGrid[j] = [];
      
      for(var i = 0; i < N; i++) {
        this.tGrid[j][i] = this.grid[i][j];
      }
    }
    
    $log.debug('built transposed grid', this.tGrid);
  }
  
  Grid.prototype.getCol = function(cell) {
    return this.tGrid[cell.colIndex];
  }
  
  Grid.prototype.buildSubgrids = function() {
    this.subgrids = [];
    
    for(var i = 0; i < Math.sqrt(N); i++){
      this.subgrids[i] = [];
      for(var j = 0; j < Math.sqrt(N); j++){
        this.subgrids[i][j] = [];
      }
    }
    
    for(var i = 0; i < N; i++) {
      for(var j = 0; j < N; j++) {
        var cell = this.grid[i][j];
        this.addCellToSubgrid(cell);
      }
    }
    
    $log.debug('built subgrids', this.subgrids);
  }
  
  Grid.prototype.addCellToSubgrid = function(cell) {
    
    var i = this.getSubgridIndex(cell.rowIndex),
      j = this.getSubgridIndex(cell.colIndex);
        
    cell.subgridRowIndex = i;
    cell.subgridColIndex = j;
        
    this.subgrids[i][j].push(cell);
  }
  
  Grid.prototype.getSubgridIndex = function(index) {
    return Math.floor(index/3);
  }
  
  Grid.prototype.getSubgridFromCell = function(cell) {
    return this.subgrids[cell.subgridRowIndex][cell.subgridColIndex];
  }
  
  Grid.prototype.solve = function() {
    
    this.initSolve();
    
    while (this.solved === false && this.failed === false && this.numIterations < 1000) {
      
      this.makeGuess();
      this.solved = this.isSolved();
      this.updateOptions();
      this.moveToNextUnknownCell();
      
      this.numIterations++;
    }
  }
  
  Grid.prototype.initSolve = function() {
    this.solved = false;
    this.failed = false;
    this.numIterations = 0;
    this.ucIndex = 0;       //unknown cell Index
    
    this.getUnknownCells();
    this.initOptions();
  }
  
  Grid.prototype.getUnknownCells = function() {
    this.unknownCells = [];
    
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        var cell = this.grid[i][j];
        
        if (cell.value === 0)
          this.unknownCells.push(cell);
      }
    }
    
    if (this.unknownCells.length === 0)
      this.solved = true;
  }
  
  Grid.prototype.initOptions = function() {
    /* the first unknown cell should only be updated once
     * after we have tried all options for this cell, the algorithm is over
     */
    var firstUnknownCell = this.unknownCells[0];
   
    this.updateCellOptions(firstUnknownCell);
    this.updateOptions();
    this.sortUnknownCells();
    
    $log.debug('initialized the options for unknown cells: ', this.unknownCells);
  }
  
  Grid.prototype.updateOptions = function() {
    if(this.solved)
      return;
  
    for (var i = this.ucIndex + 1; i < this.unknownCells.length; i++) {
      this.updateCellOptions(this.unknownCells[i]);
    }
  }
  
  Grid.prototype.updateCellOptions = function(cell) {
    if (cell.value !== 0)
      return;

    var row = this.getRow(cell),
      col = this.getCol(cell),
      subgrid = this.getSubgridFromCell(cell);
    
    this.illegalOptions = [];

    this.addIllegalOptionsFromCollection(row);
    this.addIllegalOptionsFromCollection(col);
    this.addIllegalOptionsFromCollection(subgrid);
    
    var initOptions = this.getInitOptions()
    
    cell.options = initOptions.filter(this.isLegalOption, this);
  }
  
  Grid.prototype.addIllegalOptionsFromCollection = function(collection) {
     for(var i = 0; i < collection.length; i++) {
       var cell = collection[i],
         value = cell.value;
         
       var indexOfOption = this.illegalOptions.indexOf(value);

       if (value !== 0 && indexOfOption === -1){
         this.illegalOptions.push(value);
       }
     }
  }
  
  Grid.prototype.getInitOptions = function() {
    return [1, 2, 3,
            4, 5, 6,
            7, 8, 9];
  }
  
  Grid.prototype.isLegalOption = function(element) {
    var foundIllegal = this.illegalOptions.indexOf(element),
      passed = (foundIllegal === -1);

    return passed;
  }
  
  Grid.prototype.sortUnknownCells = function() {
    /* we guess the unknown cells with the fewest options first
     * in an attempt to limit backtracking
     */
  
    this.unknownCells.sort(this.compareCells);
  }
  
  Grid.prototype.compareCells = function(cellA, cellB) {
    if (cellA.options.length < cellB.options.length) {
      return -1;
    }
    if (cellA.options.length > cellB.options.length) {
      return 1;
    }
    // cellA must have the same number of options as cellB
    return 0;
  }
  
  Grid.prototype.makeGuess = function() {
    var cell = this.unknownCells[this.ucIndex],
      options,
      nextGuess;
    
    options = cell.options;
    nextGuess = options.shift();
    
    cell.value = nextGuess;
  }
  
  Grid.prototype.isSolved = function() {
    return this.ucIndex === this.unknownCells.length - 1;
  }

  Grid.prototype.moveToNextUnknownCell = function() {
    if(this.solved)
      return;

    this.initMove();
    
    if (!this.possible && this.noMoreOptions && this.isFirstCell) {
      this.failed = true;
    } else if (!this.possible && this.noMoreOptions) {
      this.backtrack();
    } else {
      this.moveForward();
    }
  }
  
  Grid.prototype.initMove = function() {
    this.possible = this.isPossible();
    this.currentUC = this.unknownCells[this.ucIndex];
    this.isFirstCell = (this.ucIndex === 0);
    this.noMoreOptions = (this.currentUC.options.length === 0);
  }

  Grid.prototype.isPossible = function() {
    for (var i = this.ucIndex + 1; i < this.unknownCells.length; i++) {
      var uc = this.unknownCells[i];
      if (uc.value === 0 && uc.options.length === 0)
        return false;
    }

    return true;
  }

  Grid.prototype.backtrack = function() {
      this.currentUC.value = 0;

      // backtrack until we hit a cell that has options
      while(this.noMoreOptions && this.ucIndex > 0) {
        this.ucIndex--;
        this.currentUC = this.unknownCells[this.ucIndex];
        this.currentUC.value = 0;
        this.noMoreOptions = (this.currentUC.options.length === 0);
      }
  }

  Grid.prototype.moveForward = function() {
    this.ucIndex++;
  }

  /*
   * Cell
   *
   */

  function Cell(rowIndex, colIndex, value) {
    this.rowIndex = rowIndex;
    this.colIndex = colIndex;
    this.value = value;

    this.options = [];
  }

  /*
   * Main
   *
   */
  
  // 0 means empty
  var puzzle = [
    [5,3,0,  0,7,0,  0,0,0],
    [6,0,0,  1,9,5,  0,0,0],
    [0,9,8,  0,0,0,  0,6,0],
    
    [8,0,0,  0,6,0,  0,0,3],
    [4,0,0,  8,0,3,  0,0,1],
    [7,0,0,  0,2,0,  0,0,6],
    
    [0,6,0,  0,0,0,  2,8,0],
    [0,0,0,  4,1,9,  0,0,5],
    [0,0,0,  0,8,0,  0,7,9]
  ];
  
  var grid = new Grid(puzzle);
  
  grid.solve();
  
  $scope.sudoku = grid.grid;
}]);
