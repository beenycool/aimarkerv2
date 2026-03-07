'use client';
import AdaptiveInput from '../components/AdaptiveInput';
import { useState } from 'react';

export default function TestPage() {
    const [val, setVal] = useState({});
    return (
        <div className="p-8">
            <h1 className="text-2xl mb-4">Graph Canvas Test</h1>
            <AdaptiveInput
                type="graph_drawing"
                value={val}
                onChange={setVal}
            />
        </div>
    );
}