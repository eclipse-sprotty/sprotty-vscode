/******************************************************************************
 * This file was generated by langium-cli 3.0.3.
 * DO NOT EDIT MANUALLY!
 ******************************************************************************/

import type { LangiumSharedCoreServices, LangiumCoreServices, LangiumGeneratedCoreServices, LangiumGeneratedSharedCoreServices, LanguageMetaData, Module } from 'langium';
import { StatesAstReflection } from './ast.js';
import { StatesGrammar } from './grammar.js';

export const StatesLanguageMetaData = {
    languageId: 'states',
    fileExtensions: ['.sm'],
    caseInsensitive: false
} as const satisfies LanguageMetaData;

export const StatesGeneratedSharedModule: Module<LangiumSharedCoreServices, LangiumGeneratedSharedCoreServices> = {
    AstReflection: () => new StatesAstReflection()
};

export const StatesGeneratedModule: Module<LangiumCoreServices, LangiumGeneratedCoreServices> = {
    Grammar: () => StatesGrammar(),
    LanguageMetaData: () => StatesLanguageMetaData,
    parser: {}
};
