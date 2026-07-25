% v0.4.0-beta: Team Assembly — Clingo ASP Program
% =================================================
% Given required capability atoms and available humans with
% proven capabilities (from Reality Index), assemble the optimal team.
%
% Usage: clingo team_assembly.lp -c max_team=3
%
% Facts injected by service:
%   required("healthcare_domain_expertise").
%   required("app_development").
%   human("maya"). 
%   proven("maya", "app_development").
%   proven("maya", "ai").
%   hard_conflict("maya", "sarah").
%   max_team(3).
%   team_viability("maya", 85).  % from Reality Index (0-100)

% ── Parameters ──
#const max_team = 4.

% ── Input facts (injected) ──
% required(capability)
% human(id)
% proven(human, capability)
% hard_conflict(h1, h2)
% team_viability(human, score)

% ── Choose team members ──
{ team(H) : human(H) }.

% ── Hard Constraints ──

% All required capabilities must be covered
:- required(C), not proven(H, C) : team(H).

% No redundant members (each member brings at least one unique capability)
% A member is redundant if ALL their proven capabilities are ALSO
% covered by other team members
redundant(H) :- team(H), required(C), proven(H, C),
    proven(H2, C) : team(H2), H2 != H.

% Actually, redundancy is a soft constraint. A member who doesn't cover
% any new required capabilities but still brings domain diversity is OK.
% So we skip the hard redundant constraint and use soft minimization.

% Respect hard conflicts
:- team(H1), team(H2), hard_conflict(H1, H2), H1 != H2.

% Max team size
:- { team(H) : human(H) } > N, max_team(N).

% ── Soft Constraints (Optimization) ──

% Minimize team size
#minimize { 1, H : team(H) }.

% Maximize total team viability (Reality Index)
total_viability(V) :- V = #sum { S, H : team(H), team_viability(H, S) }.
#maximize { V : total_viability(V) }.

% Maximize capability diversity (number of distinct required capabilities
% covered by at least one team member)
covered_count(C) :- required(C), proven(H, C) : team(H).
#maximize { 1, C : covered_count(C) }.

% Penalize members with overlapping capabilities (prefer lean teams)
overlap_penalty(H, 1) :- team(H), not covered_count(C) : proven(H, C), required(C).
#minimize { P, H : overlap_penalty(H, P) }.

% ── Derive output ──
% Which capabilities each team member covers
member_covers(H, C) :- team(H), proven(H, C), required(C).

% ── Output ──
#show team/1.
#show member_covers/2.
#show total_viability/1.
