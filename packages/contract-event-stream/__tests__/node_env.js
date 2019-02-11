/**
 * @jest-environment node
 */
const Ganache = require("ganache-core");
const Web3 = require("web3");
// const createNewBlock$ = require("@drizzle-utils/new-block-stream");
// const { take, finalize, tap, toArray } = require("rxjs/operators");

const compile = require("./utils/compile");
const createContractEvent$ = require("../index");

jest.setTimeout(20000);

describe("contract-event-stream tests in node environment", () => {
  let provider;
  let web3;
  let accounts;
  let contractInstance;
  let artifact;

  beforeAll(async () => {
    // 1. Compile contract artifact
    const { SimpleStorageWithEvents } = await compile(
      "SimpleStorageWithEvents.sol",
    );

    // 2. Spawn Ganache test blockchain
    provider = Ganache.provider({ seed: "drizzle-utils" });
    web3 = new Web3(provider);
    accounts = await web3.eth.getAccounts();

    // 3. Create initial contract instance
    const instance = new web3.eth.Contract(SimpleStorageWithEvents.abi);

    // 4. Deploy contract and get new deployed Instance
    const deployedInstance = await instance
      .deploy({ data: SimpleStorageWithEvents.bytecode })
      .send({ from: accounts[0], gas: 150000 });

    // Note: deployed address located at `deployedInstance._address`

    contractInstance = deployedInstance;

    artifact = {
      ...SimpleStorageWithEvents,
      // truffle-decoder needs this in artifact
      networks: {
        "4447": {
          address: deployedInstance._address,
        },
      },
    };
  });

  afterAll(async () => {
    provider.close();
  });

  test("ensure test suite setup works", async () => {
    // Get old value, set a new value, check to see if it was set correctly
    const oldVal = await contractInstance.methods.get().call();
    await contractInstance.methods.set(5).send({ from: accounts[0] });
    const newVal = await contractInstance.methods.get().call();

    expect(oldVal).toBe("0");
    expect(newVal).toBe("5");
  });

  test("createContractEvent$ function exists", () => {
    expect(createContractEvent$).toBeDefined();
  });

  test("createContractEvent$ throws errors when required options fields not found", async () => {
    const { _address: address } = contractInstance;
    const { abi } = artifact;

    expect(() => createContractEvent$()).toThrow();

    expect(() => createContractEvent$({ abi, address })).toThrow(
      new Error("The options object with web3 is required"),
    );

    expect(() => createContractEvent$({ web3, address })).toThrow(
      new Error("The options object with contract abi is required"),
    );

    expect(() => createContractEvent$({ web3, abi })).toThrow(
      new Error("The options object with contract address is required"),
    );

    expect(() => createContractEvent$({ web3, abi, address })).toThrow(
      new Error("Must provide newBlock$ when using http provider with web3"),
    );
  });
});
