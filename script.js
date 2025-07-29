// --- DOM ELEMENT SELECTORS ---
const visualizer = document.getElementById('visualizer');
const generateArrayBtn = document.getElementById('generate-array');
const sortBtn = document.getElementById('sort');
const pauseResumeBtn = document.getElementById('pause-resume');
const restartBtn = document.getElementById('restart');
const sizeSlider = document.getElementById('size');
const speedSlider = document.getElementById('speed');
const algorithmSelect = document.getElementById('algorithm');
const sizeValueSpan = document.getElementById('size-value');
const speedValueSpan = document.getElementById('speed-value');

// Modal elements
const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('info-modal');
const closeInfoModalBtn = document.getElementById('close-info-modal');
const infoTitle = document.getElementById('info-title');
const infoContent = document.getElementById('info-content');

const graphBtn = document.getElementById('graph-btn');
const graphModal = document.getElementById('graph-modal');
const closeGraphModalBtn = document.getElementById('close-graph-modal');
const performanceChartCtx = document.getElementById('performance-chart').getContext('2d');
let performanceChart;

// --- STATE MANAGEMENT ---
let array = [];
let arraySize = 50;
let speed = 50;
let isSorting = false;
let isPaused = false;
let animationQueue = [];
let animationTimeoutId = null;
let synth = null;
let audioReady = false;

// --- ALGORITHM INFORMATION ---
const ALGO_INFO = {
    mergeSort: {
        title: 'Merge Sort',
        description: 'Merge Sort is an efficient, stable, comparison-based sorting algorithm. It works on the principle of "Divide and Conquer". It divides the input array into two halves, calls itself for the two halves, and then merges the two sorted halves.',
        timeComplexity: '<strong>Best:</strong> O(n log n)<br><strong>Average:</strong> O(n log n)<br><strong>Worst:</strong> O(n log n)',
        spaceComplexity: 'O(n)',
    },
    quickSort: {
        title: 'Quick Sort',
        description: 'Quick Sort is a highly efficient sorting algorithm, also based on the "Divide and Conquer" paradigm. It picks an element as a pivot and partitions the given array around the picked pivot. The key process is the partition() function.',
        timeComplexity: '<strong>Best:</strong> O(n log n)<br><strong>Average:</strong> O(n log n)<br><strong>Worst:</strong> O(n^2)',
        spaceComplexity: 'O(log n)',
    },
    selectionSort: {
        title: 'Selection Sort',
        description: 'Selection Sort is a simple in-place comparison sorting algorithm. It divides the input list into two parts: a sorted sublist of items which is built up from left to right at the front of the list and a sublist of the remaining unsorted items. It repeatedly finds the minimum element from the unsorted part and puts it at the beginning.',
        timeComplexity: '<strong>Best:</strong> O(n^2)<br><strong>Average:</strong> O(n^2)<br><strong>Worst:</strong> O(n^2)',
        spaceComplexity: 'O(1)',
    }
};

// --- COLORS ---
const PRIMARY_COLOR = '#3b82f6'; // blue-500
const SECONDARY_COLOR = '#ef4444'; // red-500
const PIVOT_COLOR = '#a855f7'; // purple-500
const SORTED_COLOR = '#22c55e'; // green-500
const ALGO_COLORS = {
    mergeSort: 'rgba(59, 130, 246, 0.8)',
    quickSort: 'rgba(168, 85, 247, 0.8)',
    selectionSort: 'rgba(239, 68, 68, 0.8)'
};

// --- PREDEFINED GRAPH DATA ---
const PREDEFINED_PERFORMANCE_DATA = {
    labels: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
    selectionSort: [0, 10, 40, 90, 160, 250, 360, 490, 640, 810, 1000], // O(n^2)
    quickSort:     [0, 5, 11, 18, 25, 32, 39, 47, 55, 63, 70],      // O(n log n)
    mergeSort:     [0, 6, 13, 21, 29, 38, 46, 55, 64, 73, 83]       // O(n log n)
};


// --- CORE FUNCTIONS ---
async function initAudio() {
    if (audioReady) return;
    await Tone.start();
    synth = new Tone.Synth().toDestination();
    audioReady = true;
}

function generateNewArray() {
    array = [];
    for (let i = 0; i < arraySize; i++) {
        array.push(Math.floor(Math.random() * 96) + 5);
    }
    renderArray();
}

function renderArray() {
    visualizer.innerHTML = '';
    const containerWidth = visualizer.clientWidth;
    const boxWidth = Math.max(2, Math.floor(containerWidth / arraySize) - 4);
    
    array.forEach((value) => {
        const box = document.createElement('div');
        box.classList.add('array-box');
        box.style.height = `${value * 2.5 + 40}px`;
        box.style.width = `${boxWidth}px`;
        
        if (boxWidth > 20) {
            box.textContent = value;
        } else {
            box.textContent = '';
        }
        
        box.dataset.value = value;
        visualizer.appendChild(box);
    });
}

function resetApp() {
    if (isSorting) clearTimeout(animationTimeoutId);
    isSorting = false;
    isPaused = false;
    animationQueue = [];
    pauseResumeBtn.textContent = 'Pause';
    toggleControls(true);
    generateNewArray();
}

function toggleControls(enable) {
    generateArrayBtn.disabled = !enable;
    sortBtn.disabled = !enable;
    sizeSlider.disabled = !enable;
    algorithmSelect.disabled = !enable;
    pauseResumeBtn.disabled = enable;
    restartBtn.disabled = enable;
}

// --- ANIMATION & SORTING ---
function startSort() {
    if (isSorting) return;
    initAudio();
    isSorting = true;
    toggleControls(false);

    const selectedAlgorithm = algorithmSelect.value;
    const arrCopy = [...array];
    
    switch (selectedAlgorithm) {
        case 'mergeSort':
            animationQueue = getMergeSortAnimations(arrCopy);
            break;
        case 'quickSort':
            animationQueue = getQuickSortAnimations(arrCopy);
            break;
        case 'selectionSort':
            animationQueue = getSelectionSortAnimations(arrCopy);
            break;
    }
    
    processAnimationQueue();
}

function processAnimationQueue() {
    if (isPaused) {
        animationTimeoutId = setTimeout(processAnimationQueue, 100);
        return;
    }
    if (animationQueue.length === 0) {
        finishAnimation();
        return;
    }

    const boxes = document.getElementsByClassName('array-box');
    const animation = animationQueue.shift();
    const { type, indices, value } = animation;

    switch (type) {
        case 'compare':
            boxes[indices[0]].style.backgroundColor = SECONDARY_COLOR;
            boxes[indices[1]].style.backgroundColor = SECONDARY_COLOR;
            break;
        case 'pivot':
             boxes[indices[0]].style.backgroundColor = PIVOT_COLOR;
             break;
        case 'uncompare':
            boxes[indices[0]].style.backgroundColor = PRIMARY_COLOR;
            boxes[indices[1]].style.backgroundColor = PRIMARY_COLOR;
            break;
        case 'swap':
            const box1 = boxes[indices[0]];
            const box2 = boxes[indices[1]];
            let tempHeight = box1.style.height;
            box1.style.height = box2.style.height;
            box2.style.height = tempHeight;
            let tempText = box1.textContent;
            box1.textContent = box2.textContent;
            box2.textContent = tempText;
            const noteValue = parseInt(box1.textContent);
            if (synth) synth.triggerAttackRelease(200 + noteValue * 3, "16n");
            break;
        case 'overwrite':
            const box = boxes[indices[0]];
            box.style.height = `${value * 2.5 + 40}px`;
            box.textContent = value;
            box.style.backgroundColor = SECONDARY_COLOR;
            if (synth && value !== undefined && value !== null) {
                synth.triggerAttackRelease(200 + value * 3, "16n");
            }
            break;
         case 'sorted':
            boxes[indices[0]].style.backgroundColor = SORTED_COLOR;
            break;
    }

    const delay = 1000 / (speed * speed / 250 + 10);
    animationTimeoutId = setTimeout(processAnimationQueue, delay);
}

function finishAnimation() {
    const boxes = document.getElementsByClassName('array-box');
    for (let i = 0; i < boxes.length; i++) {
        setTimeout(() => {
            boxes[i].style.backgroundColor = SORTED_COLOR;
            if (i === boxes.length - 1) {
                 isSorting = false;
                 toggleControls(true);
            }
        }, i * 10);
    }
}

// --- SORTING ALGORITHM LOGIC ---
function getSelectionSortAnimations(arr) {
    const animations = [];
    for (let i = 0; i < arr.length - 1; i++) {
        let minIdx = i;
        for (let j = i + 1; j < arr.length; j++) {
            animations.push({ type: 'compare', indices: [minIdx, j] });
            animations.push({ type: 'uncompare', indices: [minIdx, j] });
            if (arr[j] < arr[minIdx]) minIdx = j;
        }
        animations.push({ type: 'swap', indices: [i, minIdx] });
        animations.push({ type: 'sorted', indices: [i] });
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
    animations.push({ type: 'sorted', indices: [arr.length - 1] });
    return animations;
}
function getQuickSortAnimations(arr) {
    const animations = [];
    quickSortHelper(arr, 0, arr.length - 1, animations);
    for(let i=0; i<arr.length; i++) animations.push({type: 'sorted', indices: [i]});
    return animations;
}
function quickSortHelper(arr, low, high, animations) {
    if (low < high) {
        const pi = partition(arr, low, high, animations);
        quickSortHelper(arr, low, pi - 1, animations);
        quickSortHelper(arr, pi + 1, high, animations);
    }
}
function partition(arr, low, high, animations) {
    const pivot = arr[high];
    animations.push({ type: 'pivot', indices: [high] });
    let i = low - 1;
    for (let j = low; j < high; j++) {
        animations.push({ type: 'compare', indices: [j, high] });
        animations.push({ type: 'uncompare', indices: [j, high] });
        if (arr[j] < pivot) {
            i++;
            animations.push({ type: 'swap', indices: [i, j] });
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
    animations.push({ type: 'swap', indices: [i + 1, high] });
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    animations.push({ type: 'uncompare', indices: [high, high] });
    return i + 1;
}
function getMergeSortAnimations(arr) {
    const animations = [];
    if (arr.length <= 1) return animations;
    const auxiliaryArray = arr.slice();
    mergeSortHelper(arr, 0, arr.length - 1, auxiliaryArray, animations);
    return animations;
}
function mergeSortHelper(mainArray, startIdx, endIdx, auxiliaryArray, animations) {
    if (startIdx === endIdx) return;
    const middleIdx = Math.floor((startIdx + endIdx) / 2);
    mergeSortHelper(auxiliaryArray, startIdx, middleIdx, mainArray, animations);
    mergeSortHelper(auxiliaryArray, middleIdx + 1, endIdx, mainArray, animations);
    doMerge(mainArray, startIdx, middleIdx, endIdx, auxiliaryArray, animations);
}
function doMerge(mainArray, startIdx, middleIdx, endIdx, auxiliaryArray, animations) {
    let k = startIdx; let i = startIdx; let j = middleIdx + 1;
    while (i <= middleIdx && j <= endIdx) {
        animations.push({ type: 'compare', indices: [i, j] });
        animations.push({ type: 'uncompare', indices: [i, j] });
        if (auxiliaryArray[i] <= auxiliaryArray[j]) {
            animations.push({ type: 'overwrite', indices: [k], value: auxiliaryArray[i] });
            mainArray[k++] = auxiliaryArray[i++];
        } else {
            animations.push({ type: 'overwrite', indices: [k], value: auxiliaryArray[j] });
            mainArray[k++] = auxiliaryArray[j++];
        }
    }
    while (i <= middleIdx) {
        animations.push({ type: 'overwrite', indices: [k], value: auxiliaryArray[i] });
        mainArray[k++] = auxiliaryArray[i++];
    }
    while (j <= endIdx) {
        animations.push({ type: 'overwrite', indices: [k], value: auxiliaryArray[j] });
        mainArray[k++] = auxiliaryArray[j++];
    }
    for(let m = startIdx; m <= endIdx; m++) animations.push({ type: 'sorted', indices: [m] });
}

// --- PERFORMANCE GRAPH ---
function displayPerformanceGraph() {
    const datasets = [
        {
            label: 'Selection Sort',
            data: PREDEFINED_PERFORMANCE_DATA.selectionSort,
            borderColor: ALGO_COLORS.selectionSort,
            backgroundColor: ALGO_COLORS.selectionSort,
            tension: 0.1
        },
        {
            label: 'Quick Sort',
            data: PREDEFINED_PERFORMANCE_DATA.quickSort,
            borderColor: ALGO_COLORS.quickSort,
            backgroundColor: ALGO_COLORS.quickSort,
            tension: 0.1
        },
        {
            label: 'Merge Sort',
            data: PREDEFINED_PERFORMANCE_DATA.mergeSort,
            borderColor: ALGO_COLORS.mergeSort,
            backgroundColor: ALGO_COLORS.mergeSort,
            tension: 0.1
        }
    ];
    
    if(performanceChart) {
        performanceChart.destroy();
    }

    performanceChart = new Chart(performanceChartCtx, {
        type: 'line',
        data: { 
            labels: PREDEFINED_PERFORMANCE_DATA.labels,
            datasets: datasets
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Relative Time (ms)', color: '#d1d5db' },
                    ticks: { color: '#d1d5db' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    title: { display: true, text: 'Array Size', color: '#d1d5db' },
                    ticks: { color: '#d1d5db' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#d1d5db' }
                }
            }
        }
    });
}

// --- EVENT LISTENERS ---
generateArrayBtn.addEventListener('click', resetApp);
sortBtn.addEventListener('click', startSort);
pauseResumeBtn.addEventListener('click', () => {
    if (!isSorting) return;
    isPaused = !isPaused;
    pauseResumeBtn.textContent = isPaused ? 'Resume' : 'Pause';
});
restartBtn.addEventListener('click', () => { if (isSorting) resetApp(); });
sizeSlider.addEventListener('input', (e) => {
    arraySize = parseInt(e.target.value);
    sizeValueSpan.textContent = arraySize;
    if (!isSorting) generateNewArray();
});
speedSlider.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedValueSpan.textContent = speed;
});
window.addEventListener('resize', () => { if (!isSorting) renderArray(); });

// Modal Listeners
infoBtn.addEventListener('click', () => {
    const selectedAlgo = algorithmSelect.value;
    const data = ALGO_INFO[selectedAlgo];
    infoTitle.textContent = data.title;
    infoContent.innerHTML = `<p>${data.description}</p><div><h3 class="text-lg font-semibold text-white">Time Complexity</h3><p>${data.timeComplexity}</p></div><div><h3 class="text-lg font-semibold text-white">Space Complexity</h3><p>${data.spaceComplexity}</p></div>`;
    infoModal.classList.remove('hidden'); infoModal.classList.add('flex');
});
closeInfoModalBtn.addEventListener('click', () => { infoModal.classList.add('hidden'); infoModal.classList.remove('flex'); });

graphBtn.addEventListener('click', () => {
    displayPerformanceGraph();
    graphModal.classList.remove('hidden'); graphModal.classList.add('flex');
});
closeGraphModalBtn.addEventListener('click', () => { graphModal.classList.add('hidden'); graphModal.classList.remove('flex'); });

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', resetApp);