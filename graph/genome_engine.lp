% v0.4.0-beta: Genome Engine — Clingo ASP Program
% ==================================================
% Operators: EVOLVE (+), REGRESS (-), SWAP (~)
% 
% Usage:
%   clingo genome_engine.lp --const query_company=uber --const operator=evolve --const query_atom=healthcare
%
% Facts are injected by the service layer before running.

% ── Atom Vocabulary (injected from ontology) ──
% atom(atom_name, type).
% atom(transportation, industry).
% atom(healthcare, industry).
% atom(b2c, business_model).
% atom(on_demand, delivery).

% ── Base Genome (injected from company decomposition) ──
% genome(company_id, atom).
% genome(uber, transportation). genome(uber, b2c). genome(uber, on_demand).

% ── Density (injected from Soufflé output) ──
% density("transportation|b2c|on_demand", 47).
% density("transportation|b2c|on_demand|autonomous", 3).

% ── Query parameters (injected per request) ──
% #const query_company = uber.
% #const query_atom = healthcare.
% #const operator = evolve.   % evolve | regress | swap | gaps | validate

% ══════════════════════════════════════════════════════════
% DERIVED FACTS
% ══════════════════════════════════════════════════════════

% All atoms in the base genome
base_atom(A) :- genome(query_company, A).

% Genome hash for the base company (sorted atoms joined by |)
base_hash(H) :- H = @genome_hash(@sorted_atoms(X, base_atom(X))).

% ══════════════════════════════════════════════════════════
% EVOLVE (+): Add an atom not in the base genome
% ══════════════════════════════════════════════════════════

% Valid evolve targets: atoms not in the base genome
evolve_candidate(X) :- 
    operator = "evolve",
    atom(X, _),
    X = query_atom,
    not base_atom(X).

% Compute landing hash for the evolved genome
evolve_landing_hash(H) :-
    evolve_candidate(_),
    H = @genome_hash(@sorted_atoms(X, base_atom(X); evolve_candidate(X))).

% Look up density for the landing
evolve_landing_density(D) :-
    evolve_landing_hash(H),
    density(H, D).

% Classification
evolve_whitespace :- evolve_landing_density(0).
evolve_competitive :- evolve_landing_density(D), D > 0, D <= 20.
evolve_red_ocean :- evolve_landing_density(D), D > 20.

% ══════════════════════════════════════════════════════════
% REGRESS (-): Remove an atom from the base genome
% ══════════════════════════════════════════════════════════

regress_candidate(X) :-
    operator = "regress",
    atom(X, _),
    X = query_atom,
    base_atom(X).

regress_landing_hash(H) :-
    regress_candidate(R),
    H = @genome_hash(@sorted_atoms(X, base_atom(X), X != R)).

regress_landing_density(D) :-
    regress_landing_hash(H),
    density(H, D).

% ══════════════════════════════════════════════════════════
% SWAP (~): Replace an atom with another of the same type
% ══════════════════════════════════════════════════════════

swap_candidate(Old, New) :-
    operator = "swap",
    atom(Old, T), base_atom(Old),
    atom(New, T), not base_atom(New),
    Old = query_atom,
    New = query_replacement.

swap_landing_hash(H) :-
    swap_candidate(Old, New),
    H = @genome_hash(@sorted_atoms(X, base_atom(X), X != Old; swap_candidate(_, New))).

swap_landing_density(D) :-
    swap_landing_hash(H),
    density(H, D).

% ══════════════════════════════════════════════════════════
% EXPLANATIONS
% ══════════════════════════════════════════════════════════

explanation(operator, query_atom, "whitespace", 0) :- evolve_whitespace.
explanation(operator, query_atom, "competitive", D) :- evolve_competitive, evolve_landing_density(D).
explanation(operator, query_atom, "red_ocean", D) :- evolve_red_ocean, evolve_landing_density(D).

% ══════════════════════════════════════════════════════════
% OUTPUT
% ══════════════════════════════════════════════════════════

#show landing_hash/1.
#show landing_density/1.
#show classification/1.
#show explanation/4.
