% v0.4.0-beta: Gap Finder — Clingo ASP Program
% ==============================================
% Enumerates viable whitespace genomes (atom-sets with density 0).
% Candidate genomes are injected as unary facts, then constrained.
%
% Usage: clingo gap_finder.lp -c max_size=5
%
% Facts injected by service:
%   atom("healthcare", "industry"). 
%   atom("telemedicine", "technology").
%   feasible_pair("healthcare", "on_demand").   % from Soufflé near
%   atom_viability("healthcare", 85).            % heuristic score
%   candidate("healthcare|telemedicine|on_demand").  % pre-computed hashes

% ── Parameters ──
#const max_size = 5.
#const min_size = 2.

% ── Input facts (injected) ──
% atom(name, type)
% feasible_pair(a, b)  — atoms that co-occur or are near (depth <= 3)
% atom_viability(a, score) — viability heuristic
% candidate(hash) — candidate whitespace genome hashes

% ── Candidate genomes ──
% Decompose candidate hash into atoms
% Clingo 5 doesn't have great string processing, so we inject
% candidate_atom(hash, atom) facts from the service layer.
candidate_atom(H, A) :- candidate(H), atom(A, _).

% Select a candidate
selected(H) :- candidate(H).

% ── Constraints ──
% Must have >= 1 industry atom
:- selected(H), not { candidate_atom(H, A) : atom(A, industry) } >= 1.

% Must have a business model
:- selected(H), not { candidate_atom(H, A) : atom(A, business_model) } >= 1.

% Must have a delivery or technology atom
:- selected(H), not { candidate_atom(H, A) : atom(A, delivery) } >= 1,
   not { candidate_atom(H, A) : atom(A, technology) } >= 1.

% All atom pairs must be feasible (co-occur or near)
:- selected(H), candidate_atom(H, A), candidate_atom(H, B), A < B,
   not feasible_pair(A, B), not feasible_pair(B, A).

% ── Optimize: maximize total viability ──
% Inject viability scores as base facts
:- candidate(H), not total_viability(H, _).
total_viability(H, S) :- S = #sum { V, A : candidate_atom(H, A), atom_viability(A, V) }.

#maximize { S, H : selected(H), total_viability(H, S) }.

% ── Classify ──
whitespace(H) :- selected(H), density(H, 0).

% ── Output ──
#show selected/1.
#show total_viability/2.
