document.addEventListener('DOMContentLoaded', (event) => {
    const extendSimulationBtn = document.getElementById('extendSimulation');
    const clearSimulationBtn = document.getElementById('clearSimulation');
    const simulationTimeInput = document.getElementById('simulationTime');
    const reactorStateSlider = document.getElementById('reactorState');
    const reactorStateValue = document.getElementById('reactorStateValue');
    const animationSpeedSlider = document.getElementById('animationSpeed');
    const fullPowerPhiInput = document.getElementById('fullPowerPhi');
    const initializeChartBtn = document.getElementById('initializeChart');
    const equilibriumValuesDiv = document.getElementById('equilibriumValues');
    const maxValuesDiv = document.getElementById('maxValues');
    const currentPhiValue = document.getElementById('currentPhiValue');
    let phi_0 = 2.93e13;

    function updatePhi0() {
        phi_0 = parseFloat(fullPowerPhiInput.value);
    }

    reactorStateSlider.addEventListener('input', function () {
        const percentage = Math.round(this.value * 100);
        reactorStateValue.textContent = `${percentage}%Φ₀=`;
        currentPhiValue.textContent = `${(phi_0 * this.value).toExponential(3)}`;
    });

    initializeChartBtn.addEventListener('click', function () {
        const phi_0 = parseFloat(fullPowerPhiInput.value);
        if (isNaN(phi_0) || phi_0 <= 0) {
            alert('Please enter a valid positive number for full power neutron flux.');
            return;
        }
        updatePhi0();
        reactorStateSlider.value = '1';
        currentPhiValue.textContent = `${phi_0.toExponential(3)}`;
        clearSimulation();
        fetch(`/equilibrium_values?phi_0=${phi_0}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('eqIodine').textContent = data.iodine_infinity.toExponential(3);
                document.getElementById('eqXenon').textContent = data.xenon_infinity.toExponential(3);
                document.getElementById('eqPromethium').textContent = data.promethium_infinity.toExponential(3);
                document.getElementById('eqSamarium').textContent = data.samarium_infinity.toExponential(3);
                document.getElementById('eqXeReactivity').textContent = data.xe_reactivity_infinity.toExponential(3);
                document.getElementById('eqSmReactivity').textContent = data.sm_reactivity_infinity.toExponential(3);

                document.getElementById('maxXeConcentration').textContent = data.max_xenon.toExponential(3);
                const maxXeConcentrationTimeHours = (data.max_xenon_time * 24).toFixed(3);
                document.getElementById('maxXeConcentrationTime').textContent = `at ${maxXeConcentrationTimeHours} hours`;
                document.getElementById('maxXeReactivity').textContent = data.max_xe_reactivity.toExponential(3);
                const maxXeReactivityTimeHours = (data.max_xe_reactivity_time * 24).toFixed(3);
                document.getElementById('maxXeReactivityTime').textContent = `at ${maxXeReactivityTimeHours} hours`;
            });
    });

    let trace1 = { x: [], y: [], mode: 'lines', name: 'Iodine-135', line: { color: '#17BECF' } };
    let trace2 = { x: [], y: [], mode: 'lines', name: 'Xenon-135', line: { color: '#7F7F7F' } };
    let trace3 = { x: [], y: [], mode: 'lines', name: 'Promethium-149', line: { color: '#FF6347' } };
    let trace4 = { x: [], y: [], mode: 'lines', name: 'Samarium-149', line: { color: '#4682B4' } };

    const concentrationLayout = {
        title: 'Poison Concentration Over Time',
        xaxis: { title: 'Time (days)' },
        yaxis: { title: 'Concentration' },
        showlegend: true,
        autosize: true
    };

    Plotly.newPlot('concentrationPlot', [trace1, trace2, trace3, trace4], concentrationLayout, { responsive: true });

    let trace5 = { x: [], y: [], mode: 'lines', name: 'Xe-135 Reactivity', line: { color: '#7F7F7F' } };
    let trace6 = { x: [], y: [], mode: 'lines', name: 'Sm-149 Reactivity', line: { color: '#4682B4' } };

    const reactivityLayout = {
        title: 'Negative Reactivity Over Time',
        xaxis: { title: 'Time (days)' },
        yaxis: { title: 'Reactivity' },
        showlegend: true,
        autosize: true
    };

    Plotly.newPlot('reactivityPlot', [trace5, trace6], reactivityLayout, { responsive: true });

    function clearSimulation() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }
        Plotly.purge('concentrationPlot');
        Plotly.purge('reactivityPlot');

        trace1 = { x: [], y: [], mode: 'lines', name: 'Iodine-135', line: { color: '#17BECF' } };
        trace2 = { x: [], y: [], mode: 'lines', name: 'Xenon-135', line: { color: '#7F7F7F' } };
        trace3 = { x: [], y: [], mode: 'lines', name: 'Promethium-149', line: { color: '#FF6347' } };
        trace4 = { x: [], y: [], mode: 'lines', name: 'Samarium-149', line: { color: '#4682B4' } };
        trace5 = { x: [], y: [], mode: 'lines', name: 'Xe-135 Reactivity', line: { color: '#7F7F7F' } };
        trace6 = { x: [], y: [], mode: 'lines', name: 'Sm-149 Reactivity', line: { color: '#4682B4' } };

        Plotly.newPlot('concentrationPlot', [trace1, trace2, trace3, trace4], concentrationLayout, { responsive: true });
        Plotly.newPlot('reactivityPlot', [trace5, trace6], reactivityLayout, { responsive: true });

        simulationTimeInput.value = '';
        reactorStateSlider.value = '1';
        reactorStateValue.textContent = '100%';
        animationSpeedSlider.value = '50';
        lastUpdateTime = null;
    }

    clearSimulationBtn.addEventListener('click', clearSimulation);

    let animationFrameId = null;
    let lastUpdateTime = null;

    extendSimulationBtn.addEventListener('click', function () {
        const timeToSimulate = parseFloat(simulationTimeInput.value);
        const reactorState = reactorStateSlider.value;
        if (isNaN(timeToSimulate) || timeToSimulate <= 0) {
            alert('Please enter a valid positive number for simulation time.');
            return;
        }

        const lastIodine = trace1.y[trace1.y.length - 1] || 0;
        const lastXenon = trace2.y[trace2.y.length - 1] || 0;
        const lastPromethium = trace3.y[trace3.y.length - 1] || 0;
        const lastSamarium = trace4.y[trace4.y.length - 1] || 0;
        const lastTime = trace1.x[trace1.x.length - 1] || 0;

        fetch(`/simulation?time=${timeToSimulate}&state=${reactorState}&lastTime=${lastTime}&lastIodine=${lastIodine}&lastXenon=${lastXenon}&lastPromethium=${lastPromethium}&lastSamarium=${lastSamarium}&phi_0=${phi_0}`)
            .then(response => response.json())
            .then(data => {
                if (animationFrameId !== null) {
                    cancelAnimationFrame(animationFrameId);
                }
                animateSimulation(data);
            });
    });
    function animateSimulation(data) {
        let currentIndex = 0;
        lastUpdateTime = null;

        function updateChart(currentTime) {
            if (lastUpdateTime === null) lastUpdateTime = currentTime;

            const elapsedTime = currentTime - lastUpdateTime;

            const baseSpeed = 1;
            const exponent = parseFloat(animationSpeedSlider.value) / 50;
            const animationSpeed = Math.max(baseSpeed, Math.exp(4 - exponent));
            const pointsPerUpdate = Math.max(1, Math.floor(1000 / animationSpeed));

            if (elapsedTime >= animationSpeed) {
                if (currentIndex < data.time.length) {
                    const endIndex = Math.min(currentIndex + pointsPerUpdate, data.time.length);
                    const xData = data.time.slice(currentIndex, endIndex);
                    const iData = data.iodine.slice(currentIndex, endIndex);
                    const xeData = data.xenon.slice(currentIndex, endIndex);
                    const pmData = data.promethium.slice(currentIndex, endIndex);
                    const smData = data.samarium.slice(currentIndex, endIndex);
                    const xeReactivity = data.reactivity_xe.slice(currentIndex, endIndex);
                    const smReactivity = data.reactivity_sm.slice(currentIndex, endIndex);

                    Plotly.extendTraces('concentrationPlot', {
                        x: [xData, xData, xData, xData],
                        y: [iData, xeData, pmData, smData]
                    }, [0, 1, 2, 3]);

                    Plotly.extendTraces('reactivityPlot', {
                        x: [xData, xData],
                        y: [xeReactivity, smReactivity]
                    }, [0, 1]);

                    currentIndex = endIndex;
                    lastUpdateTime = currentTime;
                }
            }

            if (currentIndex < data.time.length) {
                animationFrameId = requestAnimationFrame(updateChart);
            }
        }

        animationFrameId = requestAnimationFrame(updateChart);
    }
});