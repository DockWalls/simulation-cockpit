import React, { useState, useEffect } from 'react'

export function ClauseSelectorPanel() {
  const [manifest, setManifest] = useState([])
  const [selectedClause, setSelectedClause] = useState(null)

  useEffect(() => {
    fetch('/dispatch/clause-manifest.yaml')
      .then(res => res.text())
      .then(text => {
        const yaml = require('js-yaml')
        setManifest(yaml.load(text).clauses)
      })
  }, [])

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Clause Selector</h2>
      <select onChange={e => setSelectedClause(manifest.find(c => c.clause_id === e.target.value))}>
        <option value="">Select a clause</option>
        {manifest.map(c => (
          <option key={c.clause_id} value={c.clause_id}>
            {c.clause_id} — {c.persona}
          </option>
        ))}
      </select>

      {selectedClause && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Viewer</h3>
          <iframe
            src={selectedClause.viewer_url}
            width="100%"
            height="600"
            title="Clause Viewer"
            style={{ border: '1px solid #ccc' }}
          />
          <p><strong>Resilience Score:</strong> {selectedClause.resilience_score}</p>
          <p><strong>Recovery Status:</strong> {selectedClause.recovery_status}</p>
        </div>
      )}
    </div>
  )
}